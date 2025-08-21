import encode from "gpt-tokenizer"

function countTokens (text) {
    return encode.encode(text).length
}
export default countTokens;