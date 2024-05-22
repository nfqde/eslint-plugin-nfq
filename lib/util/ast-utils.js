/**
 * @fileoverview Common utils for AST.
 * @author Gyandeep Singh
 */

'use strict'

// ------------------------------------------------------------------------------
// Public Interface
// ------------------------------------------------------------------------------

module.exports = {
    /**
     * Gets the property name of a given node.
     * The node can be a MemberExpression, a Property, or a MethodDefinition.
     *
     * If the name is dynamic, this returns `null`.
     *
     * For examples:
     *
     *     a.b           // => "b"
     *     a["b"]        // => "b"
     *     a['b']        // => "b"
     *     a[`b`]        // => "b"
     *     a[100]        // => "100"
     *     a[b]          // => null
     *     a["a" + "b"]  // => null
     *     a[tag`b`]     // => null
     *     a[`${b}`]     // => null
     *
     *     let a = {b: 1}            // => "b"
     *     let a = {["b"]: 1}        // => "b"
     *     let a = {['b']: 1}        // => "b"
     *     let a = {[`b`]: 1}        // => "b"
     *     let a = {[100]: 1}        // => "100"
     *     let a = {[b]: 1}          // => null
     *     let a = {["a" + "b"]: 1}  // => null
     *     let a = {[tag`b`]: 1}     // => null
     *     let a = {[`${b}`]: 1}     // => null
     *
     * @param {ASTNode} node - The node to get.
     * @returns {string|null} The property name if static. Otherwise, null.
     */
    getStaticPropertyName(node) {
        let prop

        switch (node && node.type) {
            case 'Property':
            case 'MethodDefinition':
                prop = node.key
                break

            case 'MemberExpression':
                prop = node.property
                break

            // no default
        }

        switch (prop && prop.type) {
            case 'Literal':
                return String(prop.value)

            case 'TemplateLiteral':
                if (prop.expressions.length === 0 && prop.quasis.length === 1) {
                    return prop.quasis[0].value.cooked
                }
                break

            case 'Identifier':
                if (!node.computed) {
                    return prop.name
                }
                break

            // no default
        }

        return null
    },

    /**
     * Check if the `actual` is an expected value.
     * @param {string} actual The string value to check.
     * @param {string | RegExp} expected The expected string value or pattern.
     * @returns {boolean} `true` if the `actual` is an expected value.
     */
    checkText(actual, expected) {
        return typeof expected === "string"
            ? actual === expected
            : expected.test(actual);
    },

    /**
     * Retrieve `ChainExpression#expression` value if the given node a `ChainExpression` node. Otherwise, pass through it.
     * @param {ASTNode} node The node to address.
     * @returns {ASTNode} The `ChainExpression#expression` value if the node is a `ChainExpression` node. Otherwise, the node.
     */
    skipChainExpression(node) {
        return node && node.type === "ChainExpression" ? node.expression : node;
    },

    /**
     * Check if a given node is a numeric literal or not.
     * @param {ASTNode} node The node to check.
     * @returns {boolean} `true` if the node is a number or bigint literal.
     */
    isNumericLiteral(node) {
        return (
            node.type === "Literal" && (typeof node.value === "number" || Boolean(node.bigint))
        );
    },

    /**
     * Check if a given node is an Identifier node with a given name.
     * @param {ASTNode} node The node to check.
     * @param {string | RegExp} name The expected name or the expected pattern of the object name.
     * @returns {boolean} `true` if the node is an Identifier node with the name.
     */
    isSpecificId(node, name) {
        return node.type === "Identifier" && this.checkText(node.name, name);
    },

    /**
     * Check if a given node is member access with a given object name and property name pair.
     * This is regardless of optional or not.
     * @param {ASTNode} node The node to check.
     * @param {string | RegExp | null} objectName The expected name or the expected pattern of the object name. If this is nullish, this method doesn't check object.
     * @param {string | RegExp | null} propertyName The expected name or the expected pattern of the property name. If this is nullish, this method doesn't check property.
     * @returns {boolean} `true` if the node is member access with the object name and property name pair.
     * The node is a `MemberExpression` or `ChainExpression`.
     */
    isSpecificMemberAccess(node, objectName, propertyName) {
        const checkNode = this.skipChainExpression(node);

        if (checkNode.type !== "MemberExpression") {
            return false;
        }

        if (objectName && !this.isSpecificId(checkNode.object, objectName)) {
            return false;
        }

        if (propertyName) {
            const actualPropertyName = this.getStaticPropertyName(checkNode);

            if (typeof actualPropertyName !== "string" || !this.checkText(actualPropertyName, propertyName)) {
                return false;
            }
        }

        return true;
    }
}
