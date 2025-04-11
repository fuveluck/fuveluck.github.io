import { astToString, formatCNF } from './utils.js';
import {
    replaceVariable,
    skolemizeTerm
} from './utils.js';

export function convertToCNF(ast, state) {
    state.steps.value.push({
        description: 'Initial formula',
        formula: astToString(ast)
    });

    const withoutImplications = eliminateImplications(ast, state);
    state.steps.value.push({
        description: 'Elimination of implications',
        formula: astToString(withoutImplications)
    });

    //console.log("Formula after implication", withoutImplications)

    const negationsInside = pushNegationsInward(state, withoutImplications);
    state.steps.value.push({
        description: 'Pushing negations inward',
        formula: astToString(negationsInside)
    });

    //console.log("Formula after negation", negationsInside)

    const standardizeVariable = standardizeVariables(state, negationsInside);
    state.steps.value.push({
        description: 'Standardizing variables',
        formula: astToString(standardizeVariable)
    });

    //console.log("Formula after standard", standardizeVariable)


    const prenexForm = moveToPrenexForm(state, standardizeVariable);
    state.steps.value.push({
        description: 'Conversion to prenex form',
        formula: astToString(prenexForm)
    });

    //console.log("Formula after quantifiers first", prenexForm)


    const skolemizedForm = skolemize(state, prenexForm);
    state.steps.value.push({
        description: 'Skolemization',
        formula: astToString(skolemizedForm)
    });

    //console.log("Formula after skolemization", skolemizedForm)

    const cnfForm = simplifyWithTrueFalse(state, skolemizedForm);
    state.steps.value.push({
        description: 'Conversion to conjunctive normal form',
        formula: astToString(cnfForm)
    });

    //console.log("Final CNF", cnfForm)

    //Відразу зміна до відповідності ситаксису прологу символів
    const prologForm = symbolChange(cnfForm);
    state.steps.value.push({
        description: 'Symbol replacement',
        formula: astToString(prologForm)
    });

    //console.log("Symbol replacement", prologForm)

    state.cnfResult.value = formatCNF(prologForm);
}

function eliminateImplications(ast, state) {
    if (!ast) return null;

    switch (ast.type) {
        case 'implication':
            return {
                type: 'disjunction',
                left: {
                    type: 'negation',
                    formula: eliminateImplications(ast.left, state)
                },
                right: eliminateImplications(ast.right, state)
            };
        case 'conjunction':
            return {
                type: 'conjunction',
                left: eliminateImplications(ast.left, state),
                right: eliminateImplications(ast.right, state)
            };
        case 'disjunction':
            return {
                type: 'disjunction',
                left: eliminateImplications(ast.left, state),
                right: eliminateImplications(ast.right, state)
            };
        case 'negation':
            return {
                type: 'negation',
                formula: eliminateImplications(ast.formula, state)
            };
        case 'universal':
            return {
                type: 'universal',
                variable: ast.variable,
                formula: eliminateImplications(ast.formula, state)
            };
        case 'existential':
            return {
                type: 'existential',
                variable: ast.variable,
                formula: eliminateImplications(ast.formula, state)
            };
        case 'predicate':
            return {
                type: 'predicate',
                name: ast.name,
                args: [...ast.args]
            };
        default:
            return ast;
    }
}

function pushNegationsInward(state, ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'negation': {
            const formula = ast.formula;

            switch (formula.type) {
                case 'negation':
                    return pushNegationsInward(state, formula.formula);

                case 'predicate':
                    if (formula.name === '⊤') {
                        return { type: 'predicate', name: '⊥', args: [] };
                    } else if (formula.name === '⊥') {
                        return { type: 'predicate', name: '⊤', args: [] };
                    } else {
                        return {
                            type: 'negation',
                            formula: pushNegationsInward(state, formula)
                        };
                    }

                case 'conjunction':
                    return {
                        type: 'disjunction',
                        left: pushNegationsInward(state, { type: 'negation', formula: formula.left }),
                        right: pushNegationsInward(state, { type: 'negation', formula: formula.right })
                    };

                case 'disjunction':
                    return {
                        type: 'conjunction',
                        left: pushNegationsInward(state, { type: 'negation', formula: formula.left }),
                        right: pushNegationsInward(state, { type: 'negation', formula: formula.right })
                    };

                case 'universal':
                    return {
                        type: 'existential',
                        variable: formula.variable,
                        formula: pushNegationsInward(state, { type: 'negation', formula: formula.formula })
                    };

                case 'existential':
                    return {
                        type: 'universal',
                        variable: formula.variable,
                        formula: pushNegationsInward(state, { type: 'negation', formula: formula.formula })
                    };

                default:
                    return {
                        type: 'negation',
                        formula: pushNegationsInward(state, formula)
                    };
            }
        }

        case 'conjunction':
            return {
                type: 'conjunction',
                left: pushNegationsInward(state, ast.left),
                right: pushNegationsInward(state, ast.right)
            };

        case 'disjunction':
            return {
                type: 'disjunction',
                left: pushNegationsInward(state, ast.left),
                right: pushNegationsInward(state, ast.right)
            };

        case 'universal':
            return {
                type: 'universal',
                variable: ast.variable,
                formula: pushNegationsInward(state, ast.formula)
            };

        case 'existential':
            return {
                type: 'existential',
                variable: ast.variable,
                formula: pushNegationsInward(state, ast.formula)
            };

        default:
            return ast;
    }
}

function standardizeVariables(state, ast) {
    const usedVariables = new Set();
    const freeVarMapping = new Map();

    const getNewVarName = (baseName) => {
        let newVarName = baseName;
        while (usedVariables.has(newVarName)) {
            const baseChar = baseName.charAt(0);
            const numSuffix = newVarName.substring(1) || '';
            const nextNum = numSuffix === '' ? 1 : parseInt(numSuffix) + 1;
            newVarName = baseChar + nextNum;
        }
        usedVariables.add(newVarName);
        return newVarName;
    };

    const standardize = (node, scopeVariables = new Map()) => {
        if (!node) return null;

        switch (node.type) {
            case 'predicate': {
                const newArgs = node.args.map(arg => {
                    if (arg.type === 'variable') {
                        if (scopeVariables.has(arg.name)) {
                            return { ...arg, name: scopeVariables.get(arg.name) };
                        } else {
                            if (freeVarMapping.has(arg.name)) {
                                return { ...arg, name: freeVarMapping.get(arg.name) };
                            }
                            if (usedVariables.has(arg.name)) {
                                const newVarName = getNewVarName(arg.name);
                                freeVarMapping.set(arg.name, newVarName);
                                return { ...arg, name: newVarName };
                            }
                            usedVariables.add(arg.name);
                            freeVarMapping.set(arg.name, arg.name);
                            return arg;
                        }
                    }
                    return arg;
                });
                return { ...node, args: newArgs };
            }

            case 'negation':
                return {
                    ...node,
                    formula: standardize(node.formula, scopeVariables)
                };

            case 'conjunction':
            case 'disjunction': {
                const rightResult = standardize(node.right, new Map(scopeVariables));
                const leftResult = standardize(node.left, new Map(scopeVariables));
                return {
                    ...node,
                    left: leftResult,
                    right: rightResult
                };
            }

            case 'universal':
            case 'existential': {
                const newScope = new Map(scopeVariables);
                const newVarName = getNewVarName(node.variable);
                newScope.set(node.variable, newVarName);
                const standardizedFormula = standardize(node.formula, newScope);
                return {
                    ...node,
                    variable: newVarName,
                    formula: standardizedFormula
                };
            }

            default:
                return node;
        }
    };

    return standardize(ast);
}

function moveToPrenexForm(state, ast) {
    const result = extractQuantifiers(state, ast);
    return applyQuantifiers(state, result.quantifiers, result.matrix);
}

function extractQuantifiers(state, ast) {
    if (!ast) return { quantifiers: [], matrix: null };

    switch (ast.type) {
        case 'universal':
        case 'existential': {
            const result = extractQuantifiers(state, ast.formula);
            return {
                quantifiers: [{ type: ast.type, variable: ast.variable }, ...result.quantifiers],
                matrix: result.matrix
            };
        }
        case 'conjunction': {
            const left = extractQuantifiers(state, ast.left);
            const right = extractQuantifiers(state, ast.right);
            return {
                quantifiers: [...left.quantifiers, ...right.quantifiers],
                matrix: {
                    type: 'conjunction',
                    left: left.matrix,
                    right: right.matrix
                }
            };
        }
        case 'disjunction': {
            const left = extractQuantifiers(state, ast.left);
            const right = extractQuantifiers(state, ast.right);
            return {
                quantifiers: [...left.quantifiers, ...right.quantifiers],
                matrix: {
                    type: 'disjunction',
                    left: left.matrix,
                    right: right.matrix
                }
            };
        }
        case 'negation': {
            const result = extractQuantifiers(state, ast.formula);
            return {
                quantifiers: result.quantifiers,
                matrix: {
                    type: 'negation',
                    formula: result.matrix
                }
            };
        }
        default:
            return {
                quantifiers: [],
                matrix: ast
            };
    }
}

function applyQuantifiers(state, quantifiers, matrix) {
    if (quantifiers.length === 0) return matrix;

    const [first, ...rest] = quantifiers;
    const result = applyQuantifiers(state, rest, matrix);

    switch (first.type) {
        case 'universal':
            return {
                type: 'universal',
                variable: first.variable,
                formula: result
            };

        case 'existential':
            return {
                type: 'existential',
                variable: first.variable,
                formula: result
            };

        default:
            return result;
    }
}

function skolemize(state, ast, universalVars = []) {
    if (!ast) return null;

    switch (ast.type) {
        case 'universal':
            return skolemize(state, ast.formula, [...universalVars, ast.variable]);

        case 'existential': {
            if (universalVars.length === 0) {
                const constName = generateSkolemFunctionName(state);
                const skolemConst = { type: 'constant', name: constName };
                return skolemize(state,
                    replaceVariable(ast.formula, ast.variable, skolemConst),
                    universalVars
                );
            } else {
                const funcName = generateSkolemFunctionName(state);
                const skolemFunc = {
                    type: 'function',
                    name: funcName,
                    args: universalVars.map(name => ({ type: 'variable', name }))
                };
                return skolemize(state,
                    replaceVariable(ast.formula, ast.variable, skolemFunc),
                    universalVars
                );
            }
        }

        case 'negation':
            return {
                type: 'negation',
                formula: skolemize(state, ast.formula, universalVars)
            };

        case 'conjunction':
        case 'disjunction':
            return {
                type: ast.type,
                left: skolemize(state, ast.left, universalVars),
                right: skolemize(state, ast.right, universalVars)
            };

        case 'predicate':
            return {
                type: 'predicate',
                name: ast.name,
                args: ast.args.map(arg => skolemizeTerm(arg, universalVars))
            };

        default:
            return ast;
    }
}

function generateSkolemFunctionName(state) {
    const letters = 'abcdefghijklmnopqr';
    for (let i = 0; i < letters.length; i++) {
        const name = letters[i];
        if (!state.usedSkolemNames.value.has(name)) {
            state.usedSkolemNames.value.add(name);
            return name;
        }
    }
    let index = 0;
    while (true) {
        for (let i = 0; i < letters.length; i++) {
            const name = `${letters[i]}${index}`;
            if (!state.usedSkolemNames.value.has(name)) {
                state.usedSkolemNames.value.add(name);
                return name;
            }
        }
        index++;
    }
}

function simplifyWithTrueFalse(state, ast) {
    //console.log(ast);
    const simplified = applyTruthValueSimplifications(state, ast);
    //console.log(simplified);
    const withoutImplications = eliminateImplications(simplified, state);
    //console.log(withoutImplications);
    const negationsInward = pushNegationsInward(state, withoutImplications);
    //console.log(negationsInward);
    const finalCNF = distributeDisjunctionsOverConjunctions(state, negationsInward);
    ///console.log(finalCNF);
    return finalCNF;
}

function applyTruthValueSimplifications(state, ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'conjunction':
            const leftConj = applyTruthValueSimplifications(state, ast.left);
            const rightConj = applyTruthValueSimplifications(state, ast.right);

            if ((leftConj.type === 'predicate' && leftConj.name === '⊥') ||
                (rightConj.type === 'predicate' && rightConj.name === '⊥')) {
                return { type: 'predicate', name: '⊥', args: [] };
            }

            if (leftConj.type === 'predicate' && leftConj.name === '⊤') {
                return rightConj;
            }
            if (rightConj.type === 'predicate' && rightConj.name === '⊤') {
                return leftConj;
            }

            return { type: 'conjunction', left: leftConj, right: rightConj };

        case 'disjunction':
            const leftDisj = applyTruthValueSimplifications(state, ast.left);
            const rightDisj = applyTruthValueSimplifications(state, ast.right);

            if ((leftDisj.type === 'predicate' && leftDisj.name === '⊤') ||
                (rightDisj.type === 'predicate' && rightDisj.name === '⊤')) {
                return { type: 'predicate', name: '⊤', args: [] };
            }

            if (leftDisj.type === 'predicate' && leftDisj.name === '⊥') {
                return rightDisj;
            }
            if (rightDisj.type === 'predicate' && rightDisj.name === '⊥') {
                return leftDisj;
            }

            if (JSON.stringify(leftDisj) === JSON.stringify(rightDisj)) {
                return leftDisj;
            }

            return { type: 'disjunction', left: leftDisj, right: rightDisj };

        case 'implication':
            const leftImpl = applyTruthValueSimplifications(state, ast.left);
            const rightImpl = applyTruthValueSimplifications(state, ast.right);

            if (leftImpl.type === 'predicate' && leftImpl.name === '⊤') {
                return rightImpl;
            }

            if (leftImpl.type === 'predicate' && leftImpl.name === '⊥') {
                return { type: 'predicate', name: '⊤', args: [] };
            }

            if (rightImpl.type === 'predicate' && rightImpl.name === '⊤') {
                return { type: 'predicate', name: '⊤', args: [] };
            }

            if (rightImpl.type === 'predicate' && rightImpl.name === '⊥') {
                return { type: 'negation', formula: leftImpl };
            }

            return { type: 'implication', left: leftImpl, right: rightImpl };

        case 'negation':
            const innerFormula = applyTruthValueSimplifications(state, ast.formula);

            if (innerFormula.type === 'predicate' && innerFormula.name === '⊤') {
                return { type: 'predicate', name: '⊥', args: [] };
            }

            if (innerFormula.type === 'predicate' && innerFormula.name === '⊥') {
                return { type: 'predicate', name: '⊤', args: [] };
            }

            if (innerFormula.type === 'negation') {
                return applyTruthValueSimplifications(state, innerFormula.formula);
            }

            return { type: 'negation', formula: innerFormula };

        case 'universal':
            return {
                type: 'universal',
                variable: ast.variable,
                formula: applyTruthValueSimplifications(state, ast.formula)
            };

        case 'existential':
            return {
                type: 'existential',
                variable: ast.variable,
                formula: applyTruthValueSimplifications(state, ast.formula)
            };

        default:
            return ast;
    }
}

function distributeDisjunctionsOverConjunctions(state, ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'conjunction':
            return {
                type: 'conjunction',
                left: distributeDisjunctionsOverConjunctions(state, ast.left),
                right: distributeDisjunctionsOverConjunctions(state, ast.right)
            };

        case 'universal':
        case 'existential':
            return {
                type: ast.type,
                variable: ast.variable,
                formula: distributeDisjunctionsOverConjunctions(state, ast.formula)
            };

        case 'disjunction': {
            const left = distributeDisjunctionsOverConjunctions(state, ast.left);
            const right = distributeDisjunctionsOverConjunctions(state, ast.right);

            if (left.type === 'conjunction') {
                return {
                    type: 'conjunction',
                    left: distributeDisjunctionsOverConjunctions(state, {
                        type: 'disjunction',
                        left: left.left,
                        right: right
                    }),
                    right: distributeDisjunctionsOverConjunctions(state, {
                        type: 'disjunction',
                        left: left.right,
                        right: right
                    })
                };
            }

            if (right.type === 'conjunction') {
                return {
                    type: 'conjunction',
                    left: distributeDisjunctionsOverConjunctions(state, {
                        type: 'disjunction',
                        left: left,
                        right: right.left
                    }),
                    right: distributeDisjunctionsOverConjunctions(state, {
                        type: 'disjunction',
                        left: left,
                        right: right.right
                    })
                };
            }

            return {
                type: 'disjunction',
                left,
                right
            };
        }

        case 'negation':
            if (ast.formula.type === 'negation') {
                return distributeDisjunctionsOverConjunctions(state, ast.formula.formula);
            }
            return ast;

        default:
            return ast;
    }
}

function symbolChange(ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'conjunction':
        case 'disjunction':
            return {
                type: ast.type,
                left: symbolChange(ast.left),
                right: symbolChange(ast.right)
            };

        case 'negation':
            return {
                type: 'negation',
                formula: symbolChange(ast.formula)
            };

        case 'predicate':
            return {
                type: 'predicate',
                name: ast.name.charAt(0).toLowerCase() + ast.name.slice(1),
                args: ast.args.map(arg => symbolChange(arg))
            };

        case 'function':
            return {
                type: 'function',
                name: ast.name,
                args: ast.args.map(arg => symbolChange(arg))
            };

        case 'variable':
            return {
                type: 'variable',
                name: ast.name.charAt(0).toUpperCase() + ast.name.slice(1),
            };

        case 'constant':
            return {
                type: 'constant',
                name: ast.name,
            };

        default:
            return ast;
    }
}