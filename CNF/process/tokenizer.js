export function tokenize(formula) {
    const tokenRegex = /(\(|\)|∀|∃|¬|∧|∨|⇒|,|⊤|⊥|[A-Za-z][A-Za-z0-9]*)/g;
    const tokens = [];
    let match;

    while ((match = tokenRegex.exec(formula)) !== null) {
        tokens.push(match[0]);
    }

    return tokens;
}