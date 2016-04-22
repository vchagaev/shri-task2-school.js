describe('The school library on creating', () => {
    'use strict';
    beforeEach((done) => {
        this.dbName = 'dbcreating' + Date.now();
        this.db = new School(this.dbName);
        this.dex = this.db.dexieObject;
        done();
    });

    afterEach((done) => {
        this.dex.close();
        this.dex
            .delete()
            .then(() => done());
    });

    it('should create db with specific name and scheme', (done) => {
        const dex = this.dex;
        expect(dex.name).toBe(this.dbName);
        dex.open().then(() => {
            expect(dex.tables.length).toBe(3);
            const tables = dex.tables.map((tab) => {
                return tab.name;
            });
            expect(tables).toContain('students');
            expect(tables).toContain('tasks');
            expect(tables).toContain('mentors');
            done();
        });
    });
});
