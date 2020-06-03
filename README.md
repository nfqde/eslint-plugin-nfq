# eslint-plugin-nfq

NFQ eslint rules

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `@nfq/eslint-plugin`:

```
$ npm install @nfq/eslint-plugin --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `@nfq/eslint-plugin` globally.

## Usage

Add `@nfq` to the plugins section of your `.eslintrc` configuration file. You can omit the `/eslint-plugin` suffix:

```json
{
    "plugins": [
        "@nfq"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "@nfq/no-magic-numbers": [
            "error",
            {
                "detectObjects": false,
                "enforceConst": true,
                "ignore": [0, 1],
                "ignoreArrayIndexes": true,
                "ignoreFunctions": []
            }
        ],
        "@nfq/sort-keys": [
            "error",
            "asc",
            {
                "caseSensitive": false,
                "natural": true,
                "ignorePropTypes": true,
                "methodsExtra": true
            }
        ]
    }
}
```

## Supported Rules

### @nfq/no-magic-numbers:

The same as the eslint standard except you can specify also functions that should get ignored. (Good for utilities with many possible number values e.g. sizes etc.)


### @nfq/sort-keys:

Enforce alphabethical sorting of object keys. Forked from sort-keys-fix/sort-keys-fix. You can specify that proptypes dont get checked so react can do it for itself. Also you have the possibillity to change sorting behavior that object methods get sorted as its own group and get appended (asc) or prepended (desc)




