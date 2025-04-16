import { errorMessages, getErrorMessage } from '../../core/errors.js';


export function parseFormula(tokens, usedSkolemNames){
    //console.log('Tokens:', tokens.value);
    const state = { position: 0 };
    try {
        if (!tokens.value || tokens.value.length === 0) {
            throw new Error(errorMessages.EMPTY_TOKEN);
        }

        const formula = parseImplication(tokens.value, state, usedSkolemNames);

        if (state.position < tokens.value.length) {
            throw {
                code: 'UNEXPECTED_TOKEN',
                details: `"${tokens.value[state.position]}"`
            };
        }

        return formula;
    } catch (e) {
        if (e instanceof Error && !e.code) {
            console.error("Parse error:", e.message);
            throw e;
        }
        else if (e.code && errorMessages[e.code]) {
            console.error(`Parse error (${e.code}):`, e.details);
            throw new Error(getErrorMessage(e.code, e.details));
        }
        else {
            console.error("Parse error:", e);
            throw new Error(getErrorMessage('PARSING_ERROR', e.message));
        }
    }
}

function parseImplication(tokens, state, usedSkolemNames) {
    //console.log('Tokens:', tokens[state.position]);
    const left = parseDisjunction(tokens, state, usedSkolemNames);
    if (state.position < tokens.length && tokens[state.position] === '\\Rightarrow') {
        state.position++;
        const right = parseImplication(tokens, state, usedSkolemNames);
        return {
            type: 'implication',
            left,
            right
        };
    }
    return left;
}

function parseDisjunction(tokens, state, usedSkolemNames) {
    let left = parseConjunction(tokens, state, usedSkolemNames);
    while (state.position < tokens.length && tokens[state.position] === '\\lor') {
        state.position++;
        const right = parseConjunction(tokens, state, usedSkolemNames);
        left = {
            type: 'disjunction',
            left,
            right
        };
    }
    return left;
}

function parseConjunction(tokens, state, usedSkolemNames) {
    let left = parseQuantifier(tokens, state, usedSkolemNames);
    while (state.position < tokens.length && tokens[state.position] === '\\land') {
        state.position++;
        const right = parseQuantifier(tokens, state, usedSkolemNames);
        left = {
            type: 'conjunction',
            left,
            right
        };
    }
    return left;
}

function parseQuantifier(tokens, state, usedSkolemNames) {
    try {
        if (state.position < tokens.length) {
            if (tokens[state.position] === '\\forall') {
                state.position++;
                if (state.position < tokens.length && /^[s-z][0-9]*$/.test(tokens[state.position])) {
                    const variable = tokens[state.position];
                    state.position++;
                    const formula = parseQuantifier(tokens, state, usedSkolemNames);
                    return {
                        type: 'universal',
                        variable,
                        formula
                    };
                }
                throw new Error(errorMessages.FORALL_NEEDS_VAR);
            }

            if (tokens[state.position] === '\\exists') {
                state.position++;
                if (state.position < tokens.length && /^[s-z][0-9]*$/.test(tokens[state.position])) {
                    const variable = tokens[state.position];
                    state.position++;
                    const formula = parseQuantifier(tokens, state, usedSkolemNames);
                    return {
                        type: 'existential',
                        variable,
                        formula
                    };
                }
                throw new Error(errorMessages.EXISTS_NEEDS_VAR);
            }
        }
        return parseNegation(tokens, state, usedSkolemNames);
    } catch (e) {
        if (e instanceof Error && !e.code) {
            console.error("Parse error:", e.message);
            throw e;
        } else {
            console.error("Parse error:", e);
            throw new Error(getErrorMessage('PARSING_ERROR', e.message));
        }
    }
}

function parseNegation(tokens, state, usedSkolemNames) {
        if (state.position < tokens.length && tokens[state.position] === '\\neg') {
            state.position++;
            const formula = parseNegation(tokens, state, usedSkolemNames);
            return {
                type: 'negation',
                formula
            };
        }

        return parseAtomicFormula(tokens, state, usedSkolemNames);
}

function parseAtomicFormula(tokens, state, usedSkolemNames) {
    try {
        if (state.position < tokens.length) {
            if (tokens[state.position] === '(') {
                state.position++;
                //console.log("My atomic formula:", tokens[state.position]);
                const formula = parseImplication(tokens, state, usedSkolemNames);
                //console.log(formula);

                if (state.position >= tokens.length || tokens[state.position] !== ')') {
                    //console.log("Problem is:", tokens[state.position]);
                    throw new Error(errorMessages.MISSING_CLOSING_PARENTHESIS);
                }

                state.position++;
                checkForLogicalConnective(tokens, state);
                return formula;
            }

            if (tokens[state.position] === '\\top' || tokens[state.position] === '\\bot') {
                const predicate = tokens[state.position];
                state.position++;

                checkForLogicalConnective(tokens, state);
                return {
                    type: 'predicate',
                    name: predicate,
                    args: []
                };
            }

            //not need use parentheses after negation before quantifier, if it will be like that it will not find predicate
            if (tokens[state.position] === '\\exists' || tokens[state.position] === '\\forall') {
                const formula = parseQuantifier(tokens, state, usedSkolemNames);
                //console.log(formula);
                return formula;
            }
            if (/^[A-Z][0-9]*$/.test(tokens[state.position])) {
                const predicate = tokens[state.position];
                state.position++;

                //console.log(`Parsing predicate: ${predicate}`);

                if (state.position < tokens.length && tokens[state.position] === '(') {
                    state.position++;
                    const args = [];

                    if (state.position < tokens.length && tokens[state.position] !== ')') {
                        const term = parseTerm(tokens, state, usedSkolemNames);
                        //console.log(`First arg:${JSON.stringify(term)}`);
                        args.push(term);

                        while (state.position < tokens.length && tokens[state.position] === ',') {
                            state.position++;
                            args.push(parseTerm(tokens, state, usedSkolemNames));
                        }
                    }

                    if (state.position >= tokens.length || tokens[state.position] !== ')') {
                        throw new Error(errorMessages.MISSING_CLOSING_PARENTHESIS_AFTER_PREDICATE_ARGS);
                    }

                    state.position++;

                    checkForLogicalConnective(tokens, state);

                    return {
                        type: 'predicate',
                        name: predicate,
                        args
                    };
                }
                else{
                    throw new Error(errorMessages.MISSING_OPEN_PARENTHESIS_AFTER_PREDICATE);
                }
                /*
                checkForLogicalConnective(tokens, state);

                return {
                    type: 'predicate',
                    name: predicate,
                    args: []
                };

                 */
            }
        }
        throw {
            code: 'UNEXPECTED_TOKEN while parsing atomic formula',
            details: `"${tokens[state.position]}"`
        };
    } catch (e) {
        if (e instanceof Error && !e.code) {
            console.error("Parse error:", e.message);
            throw e;
        }
        else if (e.code && errorMessages[e.code]) {
            console.error(`Parse error (${e.code}):`, e.details);
            throw new Error(getErrorMessage(e.code, e.details));
        }
        else {
            console.error("Parse error:", e);
            throw new Error(getErrorMessage('PARSING_ERROR', e.message));
        }
    }
}

function parseTerm(tokens, state, usedSkolemNames) {
    try {
        if (state.position < tokens.length) {
            const token = tokens[state.position];
            if (/^[a-z][0-9]*$/.test(token)) {
                const functionName = token;
                state.position++;

                if (state.position < tokens.length && tokens[state.position] === '(') {
                    state.position++;
                    const args = [];

                    if (state.position < tokens.length && tokens[state.position] !== ')') {
                        args.push(parseTerm(tokens, state, usedSkolemNames));

                        while (state.position < tokens.length && tokens[state.position] === ',') {
                            state.position++;
                            args.push(parseTerm(tokens, state, usedSkolemNames));
                        }
                    }

                    if (state.position >= tokens.length || tokens[state.position] !== ')') {
                        throw new Error(errorMessages.MISSING_PARENTHESIS_AFTER_ARGS);
                    }

                    usedSkolemNames.value.add(functionName);
                    state.position++;

                    //console.log(`Parsed arguments for function ${functionName}: ${JSON.stringify(args)}`);

                    return {
                        type: 'function',
                        name: functionName,
                        args
                    };
                }
                state.position--;
            }

            if (/^[s-z][0-9]*$/.test(token)) {
                const variable = token;
                state.position++;
                return {
                    type: 'variable',
                    name: variable
                };
            }

            if (/^[a-r][0-9]*$/.test(token)) {
                const constant = token;
                state.position++;
                usedSkolemNames.value.add(constant);
                return {
                    type: 'constant',
                    name: constant
                };
            }
        }
        throw {
            code: 'UNEXPECTED_TOKEN while parsing the term.',
            details: `"${tokens[state.position]}"`
        };
    }catch (e) {
        if (e instanceof Error && !e.code) {
            console.error("Parse error:", e.message);
            throw e;
        }
        else if (e.code && errorMessages[e.code]) {
            console.error(`Parse error (${e.code}):`, e.details);
            throw new Error(getErrorMessage(e.code, e.details));
        }
        else {
            console.error("Parse error:", e);
            throw new Error(getErrorMessage('PARSING_ERROR', e.message));
        }
    }
}

function checkForLogicalConnective(tokens, state) {
    try {
        while (state.position < tokens.length && tokens[state.position] === ' ') {
            state.position++;
        }
        if (state.position < tokens.length) {
            const token = tokens[state.position];
            const logicalConnectives = ['\\land', '\\lor', '\\Rightarrow',')', '\\neg'];
            if (!logicalConnectives.includes(token) && token !== undefined) {
                throw {
                    code: 'Please enter a valid logical elements. Found:',
                    details: `"${token}"`
                };
            }
        }
    }catch (e) {
        if (e.code && errorMessages[e.code]) {
            console.error(`Parse error (${e.code}):`, e.details);
            throw new Error(getErrorMessage(e.code, e.details));
        }
        else {
            console.error("Parse error:", e);
            throw new Error(getErrorMessage('PARSING_ERROR', e.message));
        }
    }
}