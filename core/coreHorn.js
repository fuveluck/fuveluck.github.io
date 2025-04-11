// logicProcessor.js

import {errorMessages} from "./errors.js";

export function convertLogicToHorn(cnfResult, logicComponents) {
    if (!cnfResult) {
        alert(errorMessages.INVALID_HORN_INPUT);
        return;
    }

    console.log('Full CNF:', JSON.stringify(cnfResult, null, 2));

    const clauses = cnfResult.value;
    console.log('Початок переводу формул:', JSON.stringify(cnfResult.value, null, 2));

    // Обробляємо кожну клаузулу
    for (const clause of clauses) {
        console.log("First clause", JSON.stringify(clause, null, 2));
        const positive = clause.filter(lit => lit.type === 'Positive').map(lit => lit.value);
        console.log("Pozitive lit", JSON.stringify(positive, null, 2));
        const negative = clause.filter(lit => lit.type === 'Negative').map(lit => lit.value);
        console.log("Negative lit", JSON.stringify(negative, null, 2));
        if (positive.length > 1) {
            alert(errorMessages.NO_HORN_CLAUSES_ERROR + JSON.stringify(clause));
            return;
        }
        if (positive.length === 0) {
            logicComponents.queries.value.push(`?- ${negative.join(', ')}.`);
        }
        else if (negative.length === 0) {
            logicComponents.facts.value.push(`${positive[0]}.`);
        }
        else {
            logicComponents.hrules.value.push(`${positive[0]} :- \n\t${negative.join(', ')}.`);
        }
    }
}
