import { convertLogicToHorn } from './core/coreHorn.js';
import { tokenize } from './CNF/process/tokenizer.js';
import { parseFormula } from './CNF/process/parser.js';
import { convertToCNF } from './CNF/process/converterCNF.js';
import { examples } from './core/examples.js';
import { errorMessages } from './core/errors.js';

const { createApp, ref, onMounted, onBeforeUnmount } = Vue;

createApp({
    setup() {
        const logicInput = ref('');
        const prologOutput = ref('');
        const menuActive = ref(false);
        const inputFormula = ref('');
        const steps = ref([]);
        const cnfResult = ref('');
        const tokens = ref([]);
        const position = ref(0);
        const usedSkolemNames = ref(new Set());
        const facts = ref([]);
        const hrules = ref([]);
        const queries = ref([]);
        const cnfFormulas = ref([]);
        const selectedExample = ref(null);
        const navbar = ref(null);
        const container = ref(null);

        const replaceSymbols = (input) => {
            return input
                .replace(/\s+/g, '')
                .replace(/\\neg/g, '¬')
                .replace(/\\forall/g, '∀')
                .replace(/\\exists/g, '∃')
                .replace(/\\Rightarrow/g, '⇒')
                .replace(/\\land/g, '∧')
                .replace(/\\lor/g, '∨')
                .replace(/\\top/g, '⊤')
                .replace(/\\bot/g, '⊥')
                .replace(/([A-Z])/g, ' $1');
        };

        onMounted(() => {
            try {
                import("//unpkg.com/mathlive?module").then((mathlive) => {
                    const mf = document.getElementById('logic-input');
                    mf.mathVirtualKeyboardPolicy = 'manual';
                   try {
                        mathlive.renderMathInDocument();
                    } catch (renderErr) {
                        console.error("Error rendering math:", renderErr);
                        alert(errorMessages.MATHLIVE_RENDER_ERROR);
                    }
                }).catch(err => {
                    console.error("Error loading MathLive:", err);
                    alert(errorMessages.MATHLIVE_LOAD_ERROR);
                });

                setTimeout(() => {
                    try {
                        const loadingEl = document.getElementById('loading');
                        const appEl = document.getElementById('app');

                        if (loadingEl) loadingEl.style.display = 'none';
                        if (appEl) appEl.style.visibility = 'visible';
                    } catch (visibilityErr) {
                        console.error("Error changing visibility:", visibilityErr);
                        alert(errorMessages.VISIBILITY_ERROR);
                    }
                }, 300);

                window.addEventListener('click', handleOutsideClick);
                adjustContainerPadding();
                window.addEventListener('resize', adjustContainerPadding);
            } catch (mountErr) {
                console.error("Error during mount:", mountErr);
                alert(errorMessages.MOUNT_ERROR);
            }
        });

        const insertSymbol = (symbol) => {
            try {
                const mathInput = document.getElementById('logic-input');
                if (!mathInput) {
                    console.error("Math input element not found");
                    alert(errorMessages.MATH_INPUT_NOT_FOUND);
                    return;
                }

                mathInput.executeCommand("insert", symbol);
                mathInput.focus();
            } catch (err) {
                console.error("Error inserting symbol:", err);
                alert(errorMessages.SYMBOL_INSERT_ERROR);
            }
        };

        const toggleMenu = () => {
            menuActive.value = !menuActive.value;
        };

        const adjustContainerPadding = () => {
            const navbarHeight = navbar.value.offsetHeight;
            container.value.style.paddingTop = `${navbarHeight}px`;
        };

        const openLink = () => {
            try {
                window.location.href = 'https://docs.google.com/forms/d/e/1FAIpQLSeXlmuS2dSgp1FoXL8I5IHir2yPCmIzUHj98QR8hxOjPASnkQ/viewform?usp=header';
            } catch (err) {
                console.error("Error navigating to CNF page:", err);
                alert(errorMessages.FORMULAR_ERROR);
            }
        };

        const goToCNF = () => {
            try {
                console.log('cnfFormulas', JSON.stringify(cnfFormulas.value))
                sessionStorage.setItem('cnfFormulas', JSON.stringify(cnfFormulas.value));
                window.location.href = 'pages/CNF_page.html';
            } catch (err) {
                console.error("Error navigating to CNF page:", err);
                alert(errorMessages.NAVIGATION_ERROR);
            }
        };

        const goToManual = () => {
            try{
                window.location.href = 'pages/manual_page.html';
            } catch (err) {
            console.error("Error navigating to CNF page:", err);
            alert(errorMessages.MANUAL_ERROR);
        }
        }

        const showExample = (exampleKey) => {
            selectedExample.value = examples[exampleKey];
            const mathField = document.getElementById('logic-input');
            if (mathField) {
                mathField.setValue(selectedExample.value.content);
            }
        };

        const onMathInput = (event) => {
            try {
                logicInput.value = event.target.value;
                console.log("Logic input updated:", logicInput.value);
            } catch (err) {
                console.error("Error updating math input:", err);
                alert(errorMessages.MATH_INPUT_UPDATE_ERROR);
            }
        };

        onBeforeUnmount(() => {
            window.removeEventListener('click', handleOutsideClick);
        });

        const handleOutsideClick = (event) => {
            const navLinks = document.querySelector('.nav-links');
            const hamburgerMenu = document.querySelector('.hamburger-menu');
            if (navLinks && hamburgerMenu &&
                !navLinks.contains(event.target) &&
                !hamburgerMenu.contains(event.target)) {
                menuActive.value = false;
            }
        };

        const checkAndConvert = () => {
            cnfFormulas.value = [];
            try {
                const mathField = document.getElementById('logic-input');
                if (mathField) {
                    const directValue = mathField.value;
                    //console.log("Метод 5 (у checkAndConvert):", directValue);
                    logicInput.value = directValue;
                } else {
                    console.error("Math field не знайдено в checkAndConvert!");
                    alert(errorMessages.MATH_FIELD_NOT_FOUND);
                    return;
                }

                if (!logicInput.value.trim()) {
                    alert(errorMessages.EMPTY_INPUT);
                    return;
                }
                console.log("---------- ПОЧАТОК КОНВЕРТАЦІЇ ----------");
                console.log("Початокова формула:", inputFormula.value);

                const formulaWithoutDisplayLines = logicInput.value.replace(/\\displaylines\{|\}/g, '');

                console.log("Replaced program:", formulaWithoutDisplayLines);

                facts.value = [];
                hrules.value = [];
                queries.value = [];

                let lines = formulaWithoutDisplayLines.split(/\\\\/);
                //console.log(lines);
                lines.forEach((line) => {
                    //console.log("Check lines:",line);
                    line = line.trim();
                    inputFormula.value = ''
                    if (line !== '') {
                        inputFormula.value = replaceSymbols(line);
                        //console.log("Formula with special symbols", inputFormula.value);
                        parseAndConvert();
                        console.log("CNF formula",cnfResult.value);
                        cnfFormulas.value.push({
                            original: line,
                            steps: [...steps.value],
                            cnf: cnfResult.value
                        });
                        console.log("What will be send",cnfFormulas);
                        try {
                            const prologProgram = {
                                facts,
                                hrules,
                                queries
                            }
                            convertLogicToHorn(cnfResult, prologProgram);
                            console.log("Your formula be in Prolog:",[facts.value, hrules.value, queries.value.join('\n')]);
                        } catch (err) {
                            console.error('Conversion error (Horn):', err);
                            alert(errorMessages.HORN_CONVERSION_ERROR);
                            prologOutput.value = 'Error in Horn conversion. Please check your input syntax.';
                        }
                    }
                })
                const result = [
                    facts.value.join('\n'),
                    hrules.value.join('\n'),
                    queries.value.join('\n')
                ].join('\n');
                console.log("Result of all formul be processed", result);
                prologOutput.value = result;
                console.log("---------- КІНЕЦЬ КОНВЕРТАЦІЇ ----------");
            } catch (err) {
                console.error('General conversion error:', err);
                alert(errorMessages.CONVERSION_ERROR);
                prologOutput.value = 'Error in conversion. Please check your input syntax.';
            }
        };

        const clearInput = () => {
            try {
                logicInput.value = '';
                prologOutput.value = '';

                const mathField = document.getElementById('logic-input');
                if (mathField) {
                    mathField.setValue('');
                    mathField.focus();
                } else {
                    console.error("Math field not found in clearInput");
                    alert(errorMessages.MATH_FIELD_NOT_FOUND_CLEAR);
                }
            } catch (err) {
                console.error("Error clearing input:", err);
                alert(errorMessages.CLEAR_INPUT_ERROR);
            }
        };

        const copyToClipboard = () => {
            try {
                if (!prologOutput.value) {
                    alert(errorMessages.NOTHING_TO_COPY);
                    return;
                }

                navigator.clipboard.writeText(prologOutput.value)
                    .then(() => console.log('Copied to clipboard'))
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        alert(errorMessages.CLIPBOARD_ERROR);
                    });
            } catch (err) {
                console.error("Error in copy function:", err);
                alert(errorMessages.COPY_FUNCTION_ERROR);
            }
        };

        const parseAndConvert = () => {

                steps.value = [];
                cnfResult.value = '';
            try {
                console.log('Formula Changed:', inputFormula.value);
                tokens.value = tokenize(inputFormula.value);
                position.value = 0;

                console.log(tokens.value);

                const ast = parseFormula(tokens);
                console.log('Formula AST:', ast);
                console.log('Full AST:', JSON.stringify(ast, null, 2));

                usedSkolemNames.value = new Set();
                collectUsedNames(ast);

                const cnfState = {
                    steps,
                    cnfResult,
                    usedSkolemNames
                };

                convertToCNF(ast, cnfState);

                console.log("CNF", cnfState.cnfResult);
                console.log('Full CNF:', JSON.stringify(cnfState.cnfResult, null, 2));
                //console.log(steps.value[1].description);
            } catch (e) {
                console.error("Process error:", e);
                alert(e.message);
            }
        };

        const collectUsedNames = (ast) => {
            try {
                if (!ast) return;

                switch (ast.type) {
                    case 'predicate':
                        ast.args.forEach(arg => collectUsedNames(arg));
                        break;
                    case 'function':
                    case 'constant':
                        usedSkolemNames.value.add(ast.name);
                        if (ast.args) {
                            ast.args.forEach(arg => collectUsedNames(arg));
                        }
                        break;
                    default:
                        if (ast.formula) {
                            collectUsedNames(ast.formula);
                        } else if (ast.left && ast.right) {
                            collectUsedNames(ast.left);
                            collectUsedNames(ast.right);
                        }
                        break;
                }
            } catch (err) {
                console.error("Error collecting used names:", err);
                alert(errorMessages.NAME_COLLECTION_ERROR);
            }
        };

        return {
            logicInput,
            menuActive,
            toggleMenu,
            navbar,
            container,
            showExample,
            selectedExample,
            openLink,
            onMathInput,
            insertSymbol,
            checkAndConvert,
            clearInput,
            copyToClipboard,
            prologOutput,
            goToCNF,
            goToManual,
            inputFormula,
            steps,
            cnfResult,
        };
    }
}).mount('#app');
