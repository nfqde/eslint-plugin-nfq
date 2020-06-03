/**
 * @fileoverview Rule to require object keys to be sorted
 * @author Toru Nagashima
 */

'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const astUtils = require('../util/ast-utils')

const naturalCompare = require('natural-compare')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Gets the property name of the given `Property` node.
 *
 * - If the property's key is an `Identifier` node, this returns the key's name
 *   whether it's a computed property or not.
 * - If the property has a static name, this returns the static name.
 * - Otherwise, this returns null.
 *
 * @param {ASTNode} node - The `Property` node to get.
 * @returns {string|null} The property name or null.
 * @private
 */
function getPropertyName(node) {
  const staticName = astUtils.getStaticPropertyName(node)

  if (staticName !== null) {
    return staticName
  }

  if (typeof node.key === 'undefined') {
    return null;
  }

  return node.key.name || null
}

/**
 * Functions which check that the given 2 names are in specific order.
 *
 * Postfix `I` is meant insensitive.
 * Postfix `N` is meant natual.
 *
 * @private
 */
const isValidOrders = {
  asc(a, b) {
    return a.name <= b.name
  },
  ascI(a, b) {
    return a.name.toLowerCase() <= b.name.toLowerCase()
  },
  ascN(a, b) {
    return naturalCompare(a.name, b.name) <= 0
  },
  ascF(a, b) {
    if (a.method === b.method) {
        return isValidOrders.asc(a, b)
    }

    return a.method <= b.method
  },
  ascIN(a, b) {
    return naturalCompare(a.name.toLowerCase(), b.name.toLowerCase()) <= 0
  },
  ascIF(a, b) {
    if (a.method === b.method) {
        return isValidOrders.ascI(a, b)
    }

    return a.method <= b.method
  },
  ascNF(a, b) {
    if (a.method === b.method) {
        return isValidOrders.ascN(a, b)
    }

    return a.method <= b.method
  },
  ascINF(a, b) {
    if (a.method === b.method) {
        return isValidOrders.ascIN(a, b)
    }

    return a.method <= b.method
  },
  desc(a, b) {
    return isValidOrders.asc(b, a)
  },
  descI(a, b) {
    return isValidOrders.ascI(b, a)
  },
  descN(a, b) {
    return isValidOrders.ascN(b, a)
  },
  descF(a, b) {
    return isValidOrders.ascF(b, a)
  },
  descIN(a, b) {
    return isValidOrders.ascIN(b, a)
  },
  descIF(a, b) {
    return isValidOrders.ascIF(b, a)
  },
  descNF(a, b) {
    return isValidOrders.ascNF(b, a)
  },
  descINF(a, b) {
    return isValidOrders.ascINF(b, a)
  },
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'require object keys to be sorted',
      category: 'Stylistic Issues',
      recommended: false,
      url: 'https://github.com/leo-buneev/eslint-plugin-sort-keys-fix',
    },

    schema: [
      {
        enum: ['asc', 'desc'],
      },
      {
        type: 'object',
        properties: {
          caseSensitive: {
            type: 'boolean',
          },
          natural: {
            type: 'boolean',
          },
          ignorePropTypes: {
            type: 'boolean',
          },
          methodsExtra: {
            type: 'boolean'
          }
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    // Parse options.
    const order = context.options[0] || 'asc'
    const options = context.options[1]
    const insensitive = (options && options.caseSensitive) === false
    const natual = Boolean(options && options.natural)
    const ignorePropTypes = Boolean(options && options.ignorePropTypes)
    const methodsExtra = Boolean(options && options.methodsExtra)
    const isValidOrder = isValidOrders[order + (insensitive ? 'I' : '') + (natual ? 'N' : '') + (methodsExtra ? 'F' : '')]

    // The stack to save the previous property's name for each object literals.
    let stack = null

    const SpreadElement = node => {
      if (node.parent.type === 'ObjectExpression') {
        stack.prevName = null
      }
    }

    return {
      ExperimentalSpreadProperty: SpreadElement,

      ObjectExpression() {
        stack = {
          upper: stack,
          prevName: null,
          prevNode: null,
        }
      },

      'ObjectExpression:exit'() {
        stack = stack.upper
      },

      SpreadElement,

      Property(node) {
        if (node.parent.type === 'ObjectPattern') {
          return
        }

        if (ignorePropTypes) {
          if (node.parent.type === 'ObjectExpression' && getPropertyName(node.parent.parent) === 'propTypes') {
            return
          }
          if (node.parent.type === 'ObjectExpression' && getPropertyName(node.parent.parent) === 'defaultProps') {
            return
          }
        }

        const prevName = stack.prevName
        const prevNode = stack.prevNode
        const thisName = getPropertyName(node)

        if (thisName !== null) {
          stack.prevName = thisName
          stack.prevNode = node || prevNode
        }

        if (prevName === null || thisName === null) {
          return
        }

        if (!isValidOrder({name: prevName, method: prevNode.method}, {name: thisName, method: node.method})) {
          context.report({
            node,
            loc: node.key.loc,
            message:
              "Expected object keys to be in {{natual}}{{insensitive}}{{order}}ending order{{methods}}. '{{thisName}}' should be before '{{prevName}}'.",
            data: {
              thisName,
              prevName,
              order,
              insensitive: insensitive ? 'insensitive ' : '',
              natual: natual ? 'natural ' : '',
              methods: methodsExtra ? ' (methods seperate)' : ''
            },
            fix(fixer) {
              const fixes = []
              const sourceCode = context.getSourceCode()
              const moveProperty = (fromNode, toNode) => {
                const prevText = sourceCode.getText(fromNode)
                const thisComments = sourceCode.getCommentsBefore(fromNode)
                for (const thisComment of thisComments) {
                  fixes.push(fixer.insertTextBefore(toNode, sourceCode.getText(thisComment) + '\n'))
                  fixes.push(fixer.remove(thisComment))
                }
                fixes.push(fixer.replaceText(toNode, prevText))
              }
              moveProperty(node, prevNode)
              moveProperty(prevNode, node)
              return fixes
            },
          })
        }
      },
    }
  },
}
