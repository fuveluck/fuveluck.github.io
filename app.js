import { convertLogicToHorn } from './core/coreHorn.js';
import { tokenize } from './CNF/process/tokenizer.js';
import { parseFormula } from './CNF/process/parser.js';
import { convertToCNF } from './CNF/process/converterCNF.js';
import { examples } from './core/examples.js';
import { errorMessages } from './core/errors.js';

const { createApp, ref, onMounted, onBeforeUnmount } = Vue;

createApp({
    setup() {
        //for formula changrs
        const inputFormula = ref('');
        const logicInput = ref('');
        const tokens = ref([]);
        const cnfState = {
            steps: ref([]),
            cnfResult: ref([]),
            usedSkolemNames: ref(new Set())
        };
        const prologProgram = {
            facts: ref([]),
            hrules: ref([]),
            queries: ref([])
        };
        const cnfFormulas = ref([]);
        //for ui
        const menuActive = ref(false);
        const mathField = ref(null);
        const prologOutput = ref('');
        const selectedExample = ref(null);
        const navbar = ref(null);
        const container = ref(null);
        const loading = ref(null);
        const loaded = ref(null);
        const logicSymbols = ref([
            { display: '\\Rightarrow', latex: '\\Rightarrow' },
            { display: '\\land', latex: '\\land' },
            { display: '\\lor', latex: '\\lor' },
            { display: '\\neg', latex: '\\neg' },
            { display: '\\exists', latex: '\\exists' },
            { display: '\\forall', latex: '\\forall' },
            { display: '\\top', latex: '\\top' },
            { display: '\\bot', latex: '\\bot' },
            { display: '( )', latex: '( )' }
        ]);

        const insertSymbol = (symbol) => {
            try {
                if (!mathField.value) {
                    console.error("Math input element not found");
                    alert(errorMessages.MATH_INPUT_NOT_FOUND);
                    return;
                }

                mathField.value.executeCommand("insert", symbol);
                mathField.value.focus();
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

        const handleOutsideClick = (event) => {
            if (menuActive.value) {
                const navLinks = document.querySelector('.nav-links');
                const hamburgerMenu = document.querySelector('.hamburger-menu');
                if (navLinks && hamburgerMenu &&
                    !navLinks.contains(event.target) &&
                    !hamburgerMenu.contains(event.target)) {
                    menuActive.value = false;
                }
            }
        };

        const openLink = () => {
            try {
                window.location.href = 'https://docs.google.com/forms/d/e/1FAIpQLSeXlmuS2dSgp1FoXL8I5IHir2yPCmIzUHj98QR8hxOjPASnkQ/viewform?usp=header';
            } catch (err) {
                console.error("Error navigating to CNF page:", err);
                alert(errorMessages.FORMULAR_ERROR);
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

        const goToCNF = () => {
            try {
                //console.log('cnfFormulas', JSON.stringify(cnfFormulas.value))
                sessionStorage.setItem('cnfFormulas', JSON.stringify(cnfFormulas.value));
                window.location.href = 'pages/CNF_page.html';
            } catch (err) {
                console.error("Error navigating to CNF page:", err);
                alert(errorMessages.NAVIGATION_ERROR);
            }
        };

        const showExample = (exampleKey) => {
            selectedExample.value = examples[exampleKey];
            if (mathField.value) {
                mathField.value.setValue(selectedExample.value.content);
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

        const parseAndConvert = () => {
            tokens.value = '';
            cnfState.steps.value = [];
            cnfState.cnfResult.value = '';
            cnfState.usedSkolemNames.value.clear();

            try {
                tokens.value = tokenize(inputFormula.value);

                const ast = parseFormula(tokens, cnfState.usedSkolemNames);
                //console.log(cnfState.usedSkolemNames.value);

                convertToCNF(ast, cnfState);

                //console.log("CNF", cnfState.cnfResult);
                //console.log('Full CNF:', JSON.stringify(cnfState.cnfResult, null, 2));

                return cnfState;
            } catch (e) {
                console.error("Process error:", e);
                alert(e.message);
            }
        };

        const checkAndConvert = () => {
            try {
                if (mathField.value) {
                    logicInput.value = mathField.value.value;
                } else {
                    console.error("Math field не знайдено в checkAndConvert!");
                    alert(errorMessages.MATH_FIELD_NOT_FOUND);
                    return;
                }
                if (!logicInput.value.trim() || logicInput.value.trim() === '\\displaylines{}') {
                    alert(errorMessages.EMPTY_INPUT);
                    return;
                }
                console.log("---------- ПОЧАТОК КОНВЕРТАЦІЇ ----------");
                //console.log("Початокова формула:", inputFormula.value);

                const formulaWithoutDisplayLines = logicInput.value.replace(/\\displaylines\{|\}/g, '');

                //console.log("Replaced program:", formulaWithoutDisplayLines);

                prologProgram.facts.value = [];
                prologProgram.hrules.value = [];
                prologProgram.queries.value = [];

                cnfFormulas.value = [];

                let lines = formulaWithoutDisplayLines.split(/\\\\/);
                lines.forEach((line) => {
                    //console.log("Check lines:",line);
                    line = line.trim();
                    inputFormula.value = ''

                    if (line !== '') {
                        inputFormula.value += line
                            .replace(/(?<!\\)([A-Z])/g, ' $1')
                            .replace(/\\left\(/g, '(')
                            .replace(/\\right\)/g, ')')

                        //console.log("Formula with special symbols", inputFormula.value);
                        parseAndConvert();
                        cnfFormulas.value.push({
                            steps: [...cnfState.steps.value],
                            cnf: cnfState.cnfResult.value
                        });
                        try {
                            convertLogicToHorn(cnfState.cnfResult, prologProgram);
                        } catch (err) {
                            console.error('Conversion error (Horn):', err);
                            alert(errorMessages.HORN_CONVERSION_ERROR);
                        }
                    }
                })
                prologOutput.value = [
                    prologProgram.facts.value.join('\n'),
                    prologProgram.hrules.value.join('\n'),
                    prologProgram.queries.value.join('\n')
                ].filter(item => item !== '').join('\n');

                //console.log("Result of all formul be processed", prologOutput.value);

                console.log("---------- КІНЕЦЬ КОНВЕРТАЦІЇ ----------");
            } catch (err) {
                console.error('General conversion error:', err);
                alert(errorMessages.CONVERSION_ERROR);
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

        const clearInput = () => {
            try {
                logicInput.value = '';
                prologOutput.value = '';

                if (mathField.value) {
                    mathField.value.setValue('');
                    //console.log(mathField.value.getValue());
                    //console.log(mathField.value.getValue().length);
                    const moveCursorToEnd = () => {
                        for (let i = 0; i < 50; i++) {
                            mathField.value.executeCommand('moveToNextChar');
                        }
                    };
                    moveCursorToEnd();
                    const deleteCharByChar = () => {
                        if (!mathField.value.getValue() || mathField.value.getValue() === '\\displaylines{}') {
                            return;
                        }
                        mathField.value.executeCommand('deleteBackward');
                        setTimeout(deleteCharByChar, 50);
                    };
                    deleteCharByChar();
                    //console.log(mathField.value.value);
                }
                else {
                    console.error("Math field not found in clearInput");
                    alert(errorMessages.MATH_FIELD_NOT_FOUND_CLEAR);
                }
            } catch (err) {
                console.error("Error clearing input:", err);
                alert(errorMessages.CLEAR_INPUT_ERROR);
            }
        };

        onMounted(() => {
            try {
                import("//unpkg.com/mathlive?module").then((mathlive) => {
                    MathfieldElement.soundsDirectory = null;
                    try {
                        mathlive.renderMathInDocument();
                    } catch (err) {
                        console.error("Error rendering math:", err);
                        alert(errorMessages.MATHLIVE_RENDER_ERROR);
                    }
                }).catch(err => {
                    console.error("Error loading MathLive:", err);
                    alert(errorMessages.MATHLIVE_LOAD_ERROR);
                });

                setTimeout(() => {
                    try {
                        if (loading.value) loading.value.style.display = 'none';
                        if (loaded.value) loaded.value.style.visibility = 'visible';
                    } catch (err) {
                        console.error("Error changing visibility:", err);
                        alert(errorMessages.VISIBILITY_ERROR);
                    }
                }, 500);

                window.addEventListener('click', handleOutsideClick);
                adjustContainerPadding();
                window.addEventListener('resize', adjustContainerPadding);
            } catch (err) {
                console.error("Error during mount:", err);
                alert(errorMessages.MOUNT_ERROR);
            }
        });

        onBeforeUnmount(() => {
            window.removeEventListener('click', handleOutsideClick);
            window.removeEventListener('resize', adjustContainerPadding);

        });

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
            cnfState,
            logicSymbols,
            loading,
            loaded,
            mathField
        };
    }
}).mount('#app');