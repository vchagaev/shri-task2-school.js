module.exports = {
    extends: 'loris/es6',
    root: true,
    env: {
        browser: true,
        jasmine: true
    },
    globals: {
        Dexie: true,
        School: true,
        createDb: true,
        deleteDb: true,
        bulkAddAndGetCollection: true
    }
};
