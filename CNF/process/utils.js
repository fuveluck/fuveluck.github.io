
//ast creation
export function astToString(ast) {
    if (!ast) return '';

    switch (ast.type) {
        case 'implication':
            return `(${astToString(ast.left)} \\Rightarrow ${astToString(ast.right)})`;
        case 'disjunction':
            return `(${astToString(ast.left)} \\lor ${astToString(ast.right)})`;
        case 'conjunction':
            return `(${astToString(ast.left)} \\land ${astToString(ast.right)})`;
        case 'negation':
            return `\\neg${astToString(ast.formula)}`;
        case 'existential':
            return `\\exists ${ast.variable} ${astToString(ast.formula)}`;
        case 'universal':
            return `\\forall ${ast.variable} ${astToString(ast.formula)}`;
        case 'predicate':
            if (ast.args.length === 0) {
                return ast.name;
            } else {
                return ` ${ast.name}(${ast.args.map(arg => termToString(arg)).join(', ')})`;
            }
        default:
            return '';
    }
}

function termToString(term) {
    if (!term) return '';

    if (term.type === 'variable') {
        return term.name;
    } else if (term.type === 'constant') {
        return term.name;
    } else if (term.type === 'function') {
        return `${term.name}(${term.args.map(arg => termToString(arg)).join(', ')})`;
    }

    return '';
}


//create array in purpose there is more than one clause after transition
export function formatCNF(ast) {
    if (!ast) return [];

    if (ast.type !== 'conjunction') {
        return [formatClause(ast)];
    }

    const clauses = collectClauses(ast);
    return clauses.map(clause => formatClause(clause));
}

function collectClauses(ast) {
    if (!ast) return [];

    if (ast.type !== 'conjunction') {
        return [ast];
    }

    return [...collectClauses(ast.left), ...collectClauses(ast.right)];
}

function formatClause(ast) {
    if (!ast) return [];

    const literals = collectLiterals(ast);
    return literals.map(lit => formatLiteral(lit));
}

function collectLiterals(ast) {
    if (!ast) return [];

    if (ast.type !== 'disjunction') {
        return [ast];
    }

    return [...collectLiterals(ast.left), ...collectLiterals(ast.right)];
}

function formatLiteral(ast) {
    if (!ast) return {};
    const literal = ast.type === 'negation'
        ? { type: 'Negative', value: formatAtom(ast.formula) }
        : { type: 'Positive', value: formatAtom(ast) };
    return literal;
}

function formatAtom(ast) {
    if (!ast || ast.type !== 'predicate') return '';
    if (ast.name === '\\top') {
        console.warn("Your formula contain logical operator", ast.name);
        return "true";
    }
    if (ast.name === '\\bot') {
        console.warn("Your formula contain logical operator", ast.name);
        return "false";
    }
    if (ast.args.length === 0) {
        return ast.name;
    } else {
        return `${ast.name}(${ast.args.map(arg => termToString(arg)).join(', ')})`;
    }
}

//standard + skolem
export function replaceVariable(formula, oldVar, newTerm) {
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

export function skolemizeTerm(term, universalVars) {
    if (!term) return null;
    if (term.type === 'function') {
        return {
            ...term,
            args: term.args.map(arg => skolemizeTerm(arg, universalVars))
        };
    }
    return term;
}