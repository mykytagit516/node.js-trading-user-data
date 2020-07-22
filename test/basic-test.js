const tap = require("tape");
const server = require('../dist');

tap.test('start the user data service', async function (t) {
  t.equal(true, true);
  await server.start();
  t.end();
});

tap.test('perform hard shutdown of user data service', function (t) {
  t.end();
  setTimeout(function(){
    process.exit();
  }, 10);
});
