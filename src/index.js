import {CompositeDisposable} from 'atom'
import EventEmitter from 'events'
import pty from 'node-pty'
import Terminal from 'xterm'
import 'xterm/lib/addons/fit/fit'

const EE = new EventEmitter()

function getTty() {
	return pty.spawn('/bin/zsh', [], {
		cwd: atom.project.getPaths()[0] || process.env.HOME,
		env: Object.assign({}, process.env, {TMUX: 'false'}),
	})
}

function wire(term, tty) {
	term.on('data', d => tty.write(d))
	tty.on('data', d => term.write(d))
	term.on('resize', ({rows, cols}) => tty.resize(cols, rows))
}

function createPanel() {
	// Add elements {{
	document.head.appendChild(Object.assign(document.createElement('link'), {
		rel: 'stylesheet',
		href: `${__dirname}/../node_modules/xterm/dist/xterm.css`,
	}))
	const div = document.body.appendChild(Object.assign(document.createElement('div'), {
		className: 'atom-summon',
		innerHTML: `<div class="term"></div>`,
	}))
	// }}

	let tty = null
	const ttyClosure = {tty}
	const term = new Terminal({cursorBlink: true})
	term.open(div.querySelector('.term'))
	window.addEventListener('resize', () => term.fit())

	function makeNewTty() {
		term.clear()
		let tty = ttyClosure.tty = getTty()
		wire(term, tty)
		tty.on('exit', () => makeNewTty())
		setTimeout(() => tty.resize(term.cols, term.rows))

	}
	makeNewTty()

	EE.on('toggle', () => {
		term.fit()
		if (Array.from(div.classList).includes('open')) {
			div.classList.remove('open')
			term.textarea.blur()
			atom.workspace.getActivePane().focus()
		} else {
			div.classList.add('open')
			term.textarea.focus()
		}
	})

	return function destroy() {
		div.remove()
		ttyClosure.tty.kill()
	}
}

let destroy = null
const subscriptions = new CompositeDisposable()
export function activate(state) {
	destroy = createPanel()
	subscriptions.add(atom.commands.add('body', 'atom-summon:toggle', () => EE.emit('toggle')))
}
export function deactivate() {
	destroy()
	subscriptions.dispose()
}
