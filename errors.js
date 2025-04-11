export const errorMessages = {
    //MAIN PAGE ERROR
    MATHLIVE_RENDER_ERROR: "Failed to render mathematical expressions. Please refresh the page.",
    MATHLIVE_LOAD_ERROR: "Failed to load MathLive library. Please refresh the page or check your internet connection.",
    VISIBILITY_ERROR: "Error displaying the application. Please refresh the page.",
    MATH_INPUT_NOT_FOUND: "Mathematical input element not found. Please refresh the page.",
    SYMBOL_INSERT_ERROR: "Failed to insert the symbol. Please try again.",
    NAVIGATION_ERROR: "Error navigating to the CNF page. Please try again.",
    MATH_INPUT_UPDATE_ERROR: "Error updating the input field. Please try again.",
    MATH_FIELD_NOT_FOUND: "Mathematical input field not found. Please refresh the page.",
    HORN_CONVERSION_ERROR: "Error converting to Horn clauses. Please check your formula structure.",
    CONVERT_FUNCTION_UNDEFINED: "The logic conversion function is not defined. Please check the application configuration.",
    CONVERSION_ERROR: "Error in conversion. Please check your input syntax and try again.",
    MATH_FIELD_NOT_FOUND_CLEAR: "Cannot clear the input field. Mathematical input element not found.",
    CLEAR_INPUT_ERROR: "Error clearing the input field. Please try again.",
    NOTHING_TO_COPY: "There is nothing to copy. Please convert a formula first.",
    CLIPBOARD_ERROR: "Failed to copy to clipboard. This may not be supported in your browser.",
    COPY_FUNCTION_ERROR: "General error in the copy function. Please try again.",
    NAME_COLLECTION_ERROR: "Error processing formula variables. Please check the formula structure.",
    MOUNT_ERROR: "Error initializing the application. Please refresh the page.",
    EMPTY_INPUT: "Please enter a first-order logic formula.",
    FORMULAR_ERROR: "The formula is no longer available.",
    MANUAL_ERROR: "The manual is not working. Please report the issue via email or through the feedback form.",

    //CNF PAGE ERROR
    GENERAL_BACK_NAVIGATION_ERROR: "Something went wrong. You will be redirected to the previous page.",
    DATA_LOAD_BACK_NAVIGATION_ERROR: "An error occurred while loading data. You will be redirected to the previous page.",
    NO_CNF_STEPS_ERROR: "No saved CNF steps found. Redirecting to the previous page.",

    //PARSE ERRORS
    FORALL_NEEDS_VAR: "Expected a variable after the ∀ quantifier.",
    EMPTY_TOKEN: "There is nothing to tokenize.",
    EXISTS_NEEDS_VAR: "Expected a variable after the ∃ quantifier.",
    MISSING_CLOSING_PARENTHESIS: "Missing closing parenthesis.",
    MISSING_CLOSING_PARENTHESIS_AFTER_PREDICATE_ARGS: "Missing closing parenthesis after predicate arguments.",
    MISSING_PARENTHESIS_AFTER_ARGS: "Missing closing parenthesis after arguments.",

    //HORN CORE ERRORS
    NO_HORN_CLAUSES_ERROR: "A Horn clause can only contain one positive literal.",
    INVALID_HORN_INPUT: "Invalid input parameter from Horn clauses.",
};

export function getErrorMessage(errorCode, details = '') {
    if (errorMessages[errorCode]) {
        return `${errorMessages[errorCode]}${details ? ' ' + details : ''}`;
    }
    return `Unexpected ERROR: ${errorCode}${details ? ' - ' + details : ''}`;
}