describe('The school library get collection', () => {
    'use strict';
    beforeAll((done) => {
        createDb(this, 'dbget' + Date.now());
        const dex = this.db.dexieObject;
        dex.transaction('rw!', dex.students, dex.tasks, () => {
            dex.students.bulkAdd([
                {name: 'student1', team: 'team1'},
                {name: 'student2', team: 'team2'},
                {name: 'student3', team: 'team2'}
            ]);
            dex.tasks.add({name: 'test'});
        }).then(() => {
            done();
        });
    });
    afterAll((done) => {
        deleteDb(this);
        done();
    });

    it('should get empty collection on empty table', (done) => {
        this.db
            .getCollection('mentors')
            .then((results) => {
                expect(results.length).toBe(0);
                done();
            });
    });

    it('should get all recods by collection name', (done) => {
        this.db
            .getCollection('students')
            .then((results) => {
                expect(results.length).toBe(3);
                const names = results.map((result) => {
                    return result.name;
                });
                expect(names).toContain('student1');
                expect(names).toContain('student2');
                expect(names).toContain('student3');
                done();
            });
    });

    it('should create array for teams with students although it is not a collection', (done) => {
        this.db
            .getCollection('teams')
            .then((results) => {
                expect(results.length).toBe(2);
                expect(results).toEqual([
                    {name: 'team1', students: [
                        {name: 'student1', team: 'team1', id: 1}
                    ]},
                    {name: 'team2', students: [
                        {name: 'student2', team: 'team2', id: 2},
                        {name: 'student3', team: 'team2', id: 3}
                    ]}
                ]);
                done();
            })
            .catch((err) => {
                fail(err);
                done();
            });
    });

    it('should catch unkownn collection request', (done) => {
        this.db
            .getCollection('someErrorCollection')
            .catch(() => {
                done();
            });
    });
});
