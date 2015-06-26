"use strict";

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _regeneratorRuntime = require("babel-runtime/regenerator")["default"];

var _interopRequireDefault = require("babel-runtime/helpers/interop-require-default")["default"];

var _bardo = require("bardo");

var _sqlBricksPostgres = require("sql-bricks-postgres");

var _sqlBricksPostgres2 = _interopRequireDefault(_sqlBricksPostgres);

var _lib = require("../lib");

var _lib2 = _interopRequireDefault(_lib);

var User = (function (_armet$Resource) {
  function User() {
    _classCallCheck(this, User);

    if (_armet$Resource != null) {
      _armet$Resource.apply(this, arguments);
    }
  }

  _inherits(User, _armet$Resource);

  _createClass(User, [{
    key: "read",
    value: function read() {
      var stmt = _sqlBricksPostgres2["default"].select("*").from("user");
      return stmt;
    }
  }, {
    key: "prepare",
    value: function prepare(row) {
      // TODO: This should be genericized
      return {
        id: row.id,
        name: row.name
      };
    }
  }, {
    key: "get",
    value: function get(req, res) {
      var stmt, countStmt, count;
      return _regeneratorRuntime.async(function get$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            stmt = this.read();
            countStmt = _sqlBricksPostgres2["default"].select("COUNT(*)").from(stmt.as("_"));
            context$2$0.next = 4;
            return _bardo.db.execute(countStmt);

          case 4:
            count = context$2$0.sent;

            // return db.execute(countStmt).then(function() {
            console.log("arguments", count);
            res.send(200, []);

          case 7:
          case "end":
            return context$2$0.stop();
        }
      }, null, this);
    }
  }]);

  return User;
})(_lib2["default"].Resource);

var server = new _lib2["default"].Server("example");
User.mount(server);
server.listen(10000);

// Create the primary statement

// Get the total count of the available items
// })

// Execute the primary statement and prepare the items
// let items = await db.execute(stmt)//).map(this.prepare.bind(this))
// console.log("items", items)

// Send back the response to the client

