const { createApp, ref, onMounted, nextTick } = Vue;
import { errorMessages } from '../core/errors.js';


createApp({
    setup() {
        const allSteps = ref([]);

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
                if (parsed.length === 0) {
                    alert(errorMessages.NO_CNF_STEPS_ERROR);
                    window.history.back();
                    return;
                }
                allSteps.value = parsed.map((formulaObj, formulaIndex) =>
                    formulaObj.steps.map(step => ({
                        description: step.description,
                        formulaHtml: '\\(' + step.formula + '\\)',
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
