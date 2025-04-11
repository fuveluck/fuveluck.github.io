const { createApp, ref, onMounted, nextTick } = Vue;
import { errorMessages } from '../core/errors.js';


createApp({
    setup() {
        const allSteps = ref([]);
        const replaceSymbols = (input) => {
            try {
                return input
                    .replace(/\s+/g, '') // Прибираємо всі пробіли
                    .replace(/\(/g, '\\left(')
                    .replace(/\)/g, '\\right)')                    .replace(/¬/g, '\\neg ')
                    .replace(/∀/g, '\\forall ')
                    .replace(/∃/g, '\\exists ')
                    .replace(/⇒/g, ' \\Rightarrow ')
                    .replace(/∧/g, ' \\land ')
                    .replace(/∨/g, ' \\lor ')
                    .replace(/⊤/g, '\\top')
                    .replace(/⊥/g, '\\bot');
            } catch (error) {
                console.error("Error in replaceSymbols:", error);
                alert(errorMessages.GENERAL_BACK_NAVIGATION_ERROR);
                window.history.back();
            }
        };
        const renderMathFields = () => {
            nextTick(() => {
                document.querySelectorAll('.math-field').forEach(elem => {
                    MathLive.renderMathInElement(elem);
                });
            });
        };
        onMounted(() => {
            try {
                const rawData = sessionStorage.getItem('cnfFormulas');
                if (!rawData) {
                    alert(errorMessages.NO_CNF_STEPS_ERROR);
                    window.history.back();
                    return;
                }
                const parsed = JSON.parse(rawData);
                console.log("Parsed CNF data:", parsed);
                allSteps.value = parsed.map((formulaObj, formulaIndex) =>
                    formulaObj.steps.map(step => ({
                        description: step.description,
                        formulaHtml: '\\(' + replaceSymbols(step.formula) + '\\)',
                        formulaIndex: formulaIndex + 1
                    }))
                );
                renderMathFields();
            } catch (error) {
                console.error("Error in onMounted:", error);
                alert(errorMessages.DATA_LOAD_BACK_NAVIGATION_ERROR);
                window.history.back();
            }
        });
        return {
            allSteps
        };
    }
}).mount('#app');
