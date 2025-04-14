export function tokenize(formula) {
    const tokenRegex = /(\(|\)|\\forall|\\exists|\\neg|\\land|\\lor|\\Rightarrow|,|\\top|\\bot|[A-Za-z][A-Za-z0-9]*)/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(formula)) !== null) {
        tokens.push(match[0]);
    }
    return tokens;
}


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

export function termToString(term) {
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
