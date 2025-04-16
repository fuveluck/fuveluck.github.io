import {astToString, termToString} from './tokenizer.js';

export function convertToCNF(ast, state) {
    state.steps.value.push({
        description: 'Initial formula',
        formula: astToString(ast)
    });

    //console.log("Formula", ast)

    const withoutImplications = eliminateImplications(ast);
    state.steps.value.push({
        description: 'Elimination of implications',
        formula: astToString(withoutImplications)
    });

    //console.log("Formula after implication", withoutImplications)

    const negationsInside = pushNegationsInward(withoutImplications);
    state.steps.value.push({
        description: 'Pushing negations inward',
        formula: astToString(negationsInside)
    });

    //console.log("Formula after negation", negationsInside)

    const standardizeVariable = standardizeVariables(negationsInside);
    state.steps.value.push({
        description: 'Standardizing variables',
        formula: astToString(standardizeVariable)
    });

    //console.log("Formula after standard", standardizeVariable)


    const prenexForm = moveToPrenexForm(standardizeVariable);
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

    const cnfForm = distributeDisjunctionsOverConjunctions(skolemizedForm);
    state.steps.value.push({
        description: 'Conversion to conjunctive normal form',
        formula: astToString(cnfForm)
    });
    //console.log("Final CNF", cnfForm)

    //Відразу зміна до відповідності ситаксису прологу символів
    const prologForm = formatCNF(cnfForm);

    //console.log("Symbol replacement", prologForm)

    state.cnfResult.value = prologForm;
}

function eliminateImplications(ast) {
    if (!ast) return null;

    let result = { type: ast.type };

    switch (ast.type) {
        case 'implication':
            return {
                type: 'disjunction',
                left: {
                    type: 'negation',
                    formula: eliminateImplications(ast.left)
                },
                right: eliminateImplications(ast.right)
            };
        case 'predicate':
            result.name = ast.name;
            result.args = [...ast.args];
            return result;
        case 'conjunction':
        case 'disjunction':
           result.left = eliminateImplications(ast.left);
           result.right = eliminateImplications(ast.right);
           return result;
        case 'negation':
            result.formula = eliminateImplications(ast.formula);
            return result;
        case 'universal':
        case 'existential':
           result.variable = ast.variable;
           result.formula = eliminateImplications(ast.formula);
           return result;
        default:
            return ast;
    }
}

function pushNegationsInward(ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'negation': {
            const formula = ast.formula;
            switch (formula.type) {
                case 'negation':
                    return pushNegationsInward(formula.formula);
                case 'predicate':
                    if (formula.name === '\\top') {
                        return { type: 'predicate', name: '\\bot', args: [] };
                    } else if (formula.name === '\\bot') {
                        return { type: 'predicate', name: '\\top', args: [] };
                    } else {
                        return {
                            type: 'negation',
                            formula: pushNegationsInward(formula)
                        };
                    }
                case 'conjunction':
                case 'disjunction':
                    const newType = formula.type === 'conjunction' ? 'disjunction' : 'conjunction';
                    return {
                        type: newType,
                        left: pushNegationsInward({ type: 'negation', formula: formula.left }),
                        right: pushNegationsInward({ type: 'negation', formula: formula.right })
                    };
                case 'universal':
                case 'existential':
                    const newQuantifier = formula.type === 'universal' ? 'existential' : 'universal';
                    return {
                        type: newQuantifier,
                        variable: formula.variable,
                        formula: pushNegationsInward({ type: 'negation', formula: formula.formula })
                    };
                default:
                    return {
                        type: 'negation',
                        formula: pushNegationsInward(formula)
                    };
            }
        }
        case 'conjunction':
        case 'disjunction':
            return {
                type: ast.type,
                left: pushNegationsInward(ast.left),
                right: pushNegationsInward(ast.right)
            };

        case 'universal':
        case 'existential':
            return {
                type: ast.type,
                variable: ast.variable,
                formula: pushNegationsInward(ast.formula)
            };
        default:
            return ast;
    }
}

function standardizeVariables(ast) {
    const usedVariables = new Set();
    const freeVariables = new Map();

    const getNewVarName = (currentName) => {
        let newVarName = currentName;
        while (usedVariables.has(newVarName)) {
            const currentSymbol = currentName.charAt(0);
            const numSuffix = newVarName.substring(1) || '';
            const nextNum = numSuffix === '' ? 1 : parseInt(numSuffix) + 1;
            newVarName = currentSymbol + nextNum;
        }
        usedVariables.add(newVarName);
        return newVarName;
    };

    const standardizeTerm = (term, scopeVariables) => {
        if (term.type === 'variable') {
            if (scopeVariables.has(term.name)) {
                return { ...term, name: scopeVariables.get(term.name) };
            } else {
                if (freeVariables.has(term.name)) {
                    return { ...term, name: freeVariables.get(term.name) };
                }
                if (usedVariables.has(term.name)) {
                    const newVarName = getNewVarName(term.name);
                    freeVariables.set(term.name, newVarName);
                    return { ...term, name: newVarName };
                }
                usedVariables.add(term.name);
                freeVariables.set(term.name, term.name);
                return term;
            }
        } else if (term.type === 'function') {
            return {
                ...term,
                args: term.args.map(arg => standardizeTerm(arg, scopeVariables))
            };
        }
        return term;
    };

    const standardize = (node, scopeVariables = new Map()) => {
        if (!node) return null;

        switch (node.type) {
            case 'predicate': {
                const newArgs = node.args.map(arg => standardizeTerm(arg, scopeVariables));
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

function moveToPrenexForm(ast) {
    const result = extractQuantifiers(ast);
    return applyQuantifiers(result.quantifiers, result.pureFormula);
}

function extractQuantifiers(ast) {
    if (!ast) return { quantifiers: [], pureFormula: null };

    switch (ast.type) {
        case 'universal':
        case 'existential': {
            const result = extractQuantifiers(ast.formula);
            return {
                quantifiers: [{ type: ast.type, variable: ast.variable }, ...result.quantifiers],
                pureFormula: result.pureFormula
            };
        }
        case 'conjunction':
        case 'disjunction': {
            const left = extractQuantifiers(ast.left);
            const right = extractQuantifiers(ast.right);
            return {
                quantifiers: [...left.quantifiers, ...right.quantifiers],
                pureFormula: {
                    type: ast.type,
                    left: left.pureFormula,
                    right: right.pureFormula
                }
            };
        }
        case 'negation': {
            const result = extractQuantifiers(ast.formula);
            return {
                quantifiers: result.quantifiers,
                pureFormula: {
                    type: 'negation',
                    formula: result.pureFormula
                }
            };
        }
        default:
            return {
                quantifiers: [],
                pureFormula: ast
            };
    }
}

function applyQuantifiers(quantifiers, pureFormula) {
    if (quantifiers.length === 0) return pureFormula;
    return quantifiers.reduceRight((formula, quantifier) => {
        return {
            type: quantifier.type,
            variable: quantifier.variable,
            formula: formula
        };
    }, pureFormula);
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

function replaceVariable(formula, oldVar, newTerm) {
    if (!formula) return null;

    switch (formula.type) {
        case 'predicate':
            return {
                ...formula,
                args: formula.args.map(arg =>
                    arg.type === 'variable' && arg.name === oldVar
                        ? newTerm
                        : skolemizeTerm(arg)
                )
            };
        case 'negation':
            return {
                ...formula,
                formula: replaceVariable(formula.formula, oldVar, newTerm)
            };
        case 'conjunction':
        case 'disjunction':
            return {
                ...formula,
                left: replaceVariable(formula.left, oldVar, newTerm),
                right: replaceVariable(formula.right, oldVar, newTerm)
            };
        case 'universal':
        case 'existential':
            return {
                ...formula,
                formula: replaceVariable(formula.formula, oldVar, newTerm)
            };
        default:
            return formula;
    }
}

function skolemizeTerm(term, universalVars) {
    if (!term) return null;
    if (term.type === 'function') {
        return {
            ...term,
            args: term.args.map(arg => skolemizeTerm(arg, universalVars))
        };
    }
    return term;
}

function distributeDisjunctionsOverConjunctions(ast) {
    if (!ast) return null;

    switch (ast.type) {
        case 'conjunction':
            const leftConj = distributeDisjunctionsOverConjunctions(ast.left);
            const rightConj = distributeDisjunctionsOverConjunctions(ast.right);

            // φ ∧ ⊥ ≡ ⊥
            if ((leftConj.type === 'predicate' && leftConj.name === '\\bot') ||
                (rightConj.type === 'predicate' && rightConj.name === '\\bot')) {
                return {type: 'predicate', name: '\\bot', args: []};
            }

            // φ ∧ ⊤ ≡ φ
            if (leftConj.type === 'predicate' && leftConj.name === '\\top') {
                return rightConj;
            }
            if (rightConj.type === 'predicate' && rightConj.name === '\\top') {
                return leftConj;
            }

            // φ ∧ ¬φ ≡ ⊥
            if (leftConj.type === 'negation' && JSON.stringify(leftConj.formula) === JSON.stringify(rightConj) ||
                rightConj.type === 'negation' && JSON.stringify(rightConj.formula) === JSON.stringify(leftConj)) {
                return {type: 'predicate', name: '\\bot', args: []};
            }

            return {type: 'conjunction', left: leftConj, right: rightConj};

        case 'disjunction':
            const leftDisj = distributeDisjunctionsOverConjunctions(ast.left);
            const rightDisj = distributeDisjunctionsOverConjunctions(ast.right);

            // φ ∨ ⊤ ≡ ⊤
            if ((leftDisj.type === 'predicate' && leftDisj.name === '\\top') ||
                (rightDisj.type === 'predicate' && rightDisj.name === '\\top')) {
                return {type: 'predicate', name: '\\top', args: []};
            }

            // φ ∨ ⊥ ≡ φ
            if (leftDisj.type === 'predicate' && leftDisj.name === '\\bot') {
                return rightDisj;
            }
            if (rightDisj.type === 'predicate' && rightDisj.name === '\\bot') {
                return leftDisj;
            }

            // φ ∨ ¬φ ≡ ⊤
            if (leftDisj.type === 'negation' && JSON.stringify(leftDisj.formula) === JSON.stringify(rightDisj) ||
                rightDisj.type === 'negation' && JSON.stringify(rightDisj.formula) === JSON.stringify(leftDisj)) {
                return {type: 'predicate', name: '\\top', args: []};
            }

            // φ∨φ≡φ
            if (JSON.stringify(leftDisj) === JSON.stringify(rightDisj)) {
                return leftDisj;
            }

            // φ ∨ (ψ ∧ θ) ≡ (φ ∨ ψ) ∧ (φ ∨ θ)
            if (rightDisj.type === 'conjunction') {
                return {
                    type: 'conjunction',
                    left: distributeDisjunctionsOverConjunctions({
                        type: 'disjunction',
                        left: leftDisj,
                        right: rightDisj.left
                    }),
                    right: distributeDisjunctionsOverConjunctions({
                        type: 'disjunction',
                        left: leftDisj,
                        right: rightDisj.right
                    })
                };
            }
            //(ψ ∧ θ) ∨ φ ≡ (ψ ∨ φ) ∧ (θ ∨ φ)
            if (leftDisj.type === 'conjunction') {
                return {
                    type: 'conjunction',
                    left: distributeDisjunctionsOverConjunctions({
                        type: 'disjunction',
                        left: leftDisj.left,
                        right: rightDisj
                    }),
                    right: distributeDisjunctionsOverConjunctions({
                        type: 'disjunction',
                        left: leftDisj.right,
                        right: rightDisj
                    })
                };
            }

            return {type: 'disjunction', left: leftDisj, right: rightDisj};

        default:
            return ast;
    }
}

function formatCNF(ast) {
    if (!ast) return [];

    if (ast.type !== 'conjunction') return [formatClause(ast)];

    return [...formatCNF(ast.left), ...formatCNF(ast.right)];
}

function formatClause(ast) {
    if (!ast) return [];

    const literals = [];
    const clause = [ast];

    while (clause.length) {
        const literal = clause.pop();
        if (!literal) continue;

        if (literal.type === 'disjunction') {
            clause.push(literal.right, literal.left);
        } else {
            literals.push({
                type: literal.type === 'negation' ? 'Negative' : 'Positive',
                value: formatAtom(literal.type === 'negation' ? literal.formula : literal),
            });
        }
    }

    return literals;
}

function formatAtom(ast) {
    if (ast.name === '\\top') return 'true';
    if (ast.name === '\\bot') return 'false';

    const name = ast.name.charAt(0).toLowerCase() + ast.name.slice(1);
    if (ast.args.length === 0) return name;
    return `${name}(${ast.args.map(formatTerm).join(', ')})`;
}

function formatTerm(term) {
    if (term.type === 'variable') {
        return term.name.charAt(0).toUpperCase() + term.name.slice(1);
    } else {
        return term.name;
    }
}
