describe('The school array filter', () => {
    'use strict';
    beforeAll((done) => {
        createDb(this, 'dbfilter' + Date.now());
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

    afterAll(() => {
        deleteDb(this);
    });

    it('should filter collection on indexed field', (done) => {
        this.db.transaction(() => {
            this.db
                .getCollectionWhere('students', 'id', 1)
                .then((students) => {
                    expect(students[0]).toEqual({name: 'student1', team: 'team1', id: 1});
                });
            this.db
                .getCollectionWhere('students', 'team', 'team2')
                .then((students) => {
                    expect(students.length).toBe(2);
                    expect(students[0]).toEqual({name: 'student2', team: 'team2', id: 2});
                    expect(students[1]).toEqual({name: 'student3', team: 'team2', id: 3});
                });
            this.db
                .getCollectionWhere('students', 'team', 'noneTeam')
                .then((students) => {
                    expect(students.length).toBe(0);
                });
        }).then(() => done());
    });

    it('should get error on unknow field', (done) => {
        this.db
            .getCollectionWhere('badField', 'something')
            .catch(() => done());
    });
});
