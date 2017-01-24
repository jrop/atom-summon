'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.activate = activate;
exports.deactivate = deactivate;

var _atom = require('atom');

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _nodePty = require('node-pty');

var _nodePty2 = _interopRequireDefault(_nodePty);

var _xterm = require('xterm');

var _xterm2 = _interopRequireDefault(_xterm);

require('xterm/lib/addons/fit/fit');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EE = new _events2.default();

function getTty() {
	return _nodePty2.default.spawn('/bin/zsh', [], {
		cwd: atom.project.getPaths()[0] || process.env.HOME,
		env: Object.assign({}, process.env, { TMUX: 'false' })
	});
}

function wire(term, tty) {
	term.on('data', function (d) {
		return tty.write(d);
	});
	tty.on('data', function (d) {
		return term.write(d);
	});
	term.on('resize', function (_ref) {
		var rows = _ref.rows,
		    cols = _ref.cols;
		return tty.resize(cols, rows);
	});
}

function createPanel() {
	// Add elements {{
	document.head.appendChild(Object.assign(document.createElement('link'), {
		rel: 'stylesheet',
		href: __dirname + '/../node_modules/xterm/dist/xterm.css'
	}));
	var div = document.body.appendChild(Object.assign(document.createElement('div'), {
		className: 'atom-summon',
		innerHTML: '<div class="term"></div>'
	}));
	// }}

	var tty = null;
	var ttyClosure = { tty: tty };
	var term = new _xterm2.default({ cursorBlink: true });
	term.open(div.querySelector('.term'));
	window.addEventListener('resize', function () {
		return term.fit();
	});

	function makeNewTty() {
		term.clear();
		var tty = ttyClosure.tty = getTty();
		wire(term, tty);
		tty.on('exit', function () {
			return makeNewTty();
		});
		setTimeout(function () {
			return tty.resize(term.cols, term.rows);
		});
	}
	makeNewTty();

	EE.on('toggle', function () {
		term.fit();
		if (Array.from(div.classList).includes('open')) {
			div.classList.remove('open');
			term.textarea.blur();
			atom.workspace.getActivePane().focus();
		} else {
			div.classList.add('open');
			term.textarea.focus();
		}
	});

	return function destroy() {
		div.remove();
		ttyClosure.tty.kill();
	};
}

var destroy = null;
var subscriptions = new _atom.CompositeDisposable();
function activate(state) {
	destroy = createPanel();
	subscriptions.add(atom.commands.add('body', 'atom-summon:toggle', function () {
		return EE.emit('toggle');
	}));
}
function deactivate() {
	destroy();
	subscriptions.dispose();
}