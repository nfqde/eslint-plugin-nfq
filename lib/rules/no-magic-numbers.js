/**
 * @fileoverview Allows for Ignoring functions
 * @author Christoph Kruppe
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "disallow magic numbers, allows for ignoring functions",
            category: "Best Practices",
            recommended: false
        },
        fixable: null,  // or "code" or "whitespace"
        schema: [{
            type: "object",
            properties: {
                detectObjects: {
                    type: "boolean",
                    default: false
                },
                enforceConst: {
                    type: "boolean",
                    default: false
                },
                ignore: {
                    type: "array",
                    items: {
                        type: "number"
                    },
                    uniqueItems: true
                },
                ignoreFunctions: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    uniqueItems: true
                },
                ignoreArrayIndexes: {
                    type: "boolean",
                    default: false
                },
                ignoreArrays: {
                    type: "boolean",
                    default: false
                }
            },
            additionalProperties: false
        }],

        messages: {
            useConst: "Number constants declarations must use 'const'.",
            noMagic: "No magic number: {{raw}}."
        }
    },

    create: function(context) {
        const config = context.options[0] || {},
            detectObjects = !!config.detectObjects,
            enforceConst = !!config.enforceConst,
            ignore = config.ignore || [],
            ignoreFunctions = config.ignoreFunctions || [],
            ignoreArrayIndexes = !!config.ignoreArrayIndexes,
            ignoreArrays = !!config.ignoreArrays;

        /**
         * Returns whether the node is number literal
         * @param {Node} node - the node literal being evaluated
         * @returns {boolean} true if the node is a number literal
         */
        function isNumber(node) {
            return typeof node.value === "number";
        }

        /**
         * Returns whether the number should be ignored
         * @param {number} num - the number
         * @returns {boolean} true if the number should be ignored
         */
        function shouldIgnoreNumber(num) {
            return ignore.indexOf(num) !== -1;
        }

        /**
         * Returns whether the number should be ignored when used as a radix within parseInt() or Number.parseInt()
         * @param {ASTNode} parent - the non-"UnaryExpression" parent
         * @param {ASTNode} node - the node literal being evaluated
         * @returns {boolean} true if the number should be ignored
         */
        function shouldIgnoreParseInt(parent, node) {
            return parent.type === "CallExpression" && node === parent.arguments[1] &&
                (parent.callee.name === "parseInt" ||
                parent.callee.type === "MemberExpression" &&
                parent.callee.object.name === "Number" &&
                parent.callee.property.name === "parseInt");
        }

        function shouldIgnoreFunctions(parent) {
            return (parent.type === "CallExpression" && ignoreFunctions.includes(parent.callee.name))
                || (parent.type === "CallExpression"
                    && parent.callee.type === "MemberExpression"
                    && ignoreFunctions.includes(parent.callee.property.name)
                );
        }

        /**
         * Returns whether the number should be ignored when used to define a JSX prop
         * @param {ASTNode} parent - the non-"UnaryExpression" parent
         * @returns {boolean} true if the number should be ignored
         */
        function shouldIgnoreJSXNumbers(parent) {
            return parent.type.indexOf("JSX") === 0;
        }

        /**
         * Returns whether the number should be ignored when used as an array index with enabled 'ignoreArrayIndexes' option.
         * @param {ASTNode} parent - the non-"UnaryExpression" parent.
         * @returns {boolean} true if the number should be ignored
         */
        function shouldIgnoreArrayIndexes(parent) {
            return parent.type === "MemberExpression" && ignoreArrayIndexes;
        }

        function shouldIgnoreArrays(parent, value, fullNumberNode) {
            return parent.type === "ArrayExpression" && ignoreArrays;
        }

        return {
            Literal(node) {
                const okTypes = detectObjects ? [] : ["ObjectExpression", "Property", "AssignmentExpression"];

                if (!isNumber(node)) {
                    return;
                }

                let fullNumberNode;
                let parent;
                let value;
                let raw;

                // For negative magic numbers: update the value and parent node
                if (node.parent.type === "UnaryExpression" && node.parent.operator === "-") {
                    fullNumberNode = node.parent;
                    parent = fullNumberNode.parent;
                    value = -node.value;
                    raw = `-${node.raw}`;
                } else {
                    fullNumberNode = node;
                    parent = node.parent;
                    value = node.value;
                    raw = node.raw;
                }

                if (shouldIgnoreNumber(value) ||
                    shouldIgnoreParseInt(parent, fullNumberNode) ||
                    shouldIgnoreArrayIndexes(parent) ||
                    shouldIgnoreJSXNumbers(parent) ||
                    shouldIgnoreFunctions(parent) ||
                    shouldIgnoreArrays(parent, value, fullNumberNode)) {
                    return;
                }

                if (parent.type === "VariableDeclarator") {
                    if (enforceConst && parent.parent.kind !== "const") {
                        context.report({
                            node: fullNumberNode,
                            messageId: "useConst"
                        });
                    }
                } else if (
                    okTypes.indexOf(parent.type) === -1 ||
                    (parent.type === "AssignmentExpression" && parent.left.type === "Identifier")
                ) {
                    context.report({
                        node: fullNumberNode,
                        messageId: "noMagic",
                        data: {
                            raw
                        }
                    });
                }
            }
        };
    }
};
