const faker = require('faker');

module.exports = {
  'GET /demo': (req, res) => {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const username = faker.internet.userName(firstName, lastName);

    res.send({
      id: faker.random.uuid(),
      userName: username,
      email: faker.internet.email(firstName, lastName),
      firstName: firstName,
      lastName: lastName,
    });
  },
};
