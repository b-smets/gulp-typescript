///<reference path='../definitions/ref.d.ts'/>

import ts = require('typescript');
import tsApi = require('./tsapi');
import gutil = require('gulp-util');
import project = require('./project');
import file = require('./file');
import utils = require('./utils');
import fs = require('fs');
import path = require('path');

export class Host implements ts.CompilerHost {
	static libDefault: utils.Map<ts.SourceFile> = {};
	static getLibDefault(typescript: typeof ts) {
		var filename: string;
		for (var i in require.cache) {
			if (!Object.prototype.hasOwnProperty.call(require.cache, i)) continue;

			if (require.cache[i].exports === typescript) {
				filename = i;
			}
		}
		if (filename === undefined) {
			return undefined; // Not found
		}
		if (this.libDefault[filename]) {
			return this.libDefault[filename]; // Already loaded
		}

		var content = fs.readFileSync(path.resolve(path.dirname(filename) + '/lib.d.ts')).toString('utf8');
		return this.libDefault[filename] = tsApi.createSourceFile(typescript, '__lib.d.ts', content, typescript.ScriptTarget.ES3); // Will also work for ES5 & 6
	}

	typescript: typeof ts;

	private currentDirectory: string;
	private externalResolve: boolean;
	input: file.FileCache;
	output: utils.Map<string>;

	constructor(typescript: typeof ts, currentDirectory: string, input: file.FileCache, externalResolve: boolean) {
		this.typescript = typescript;

		this.currentDirectory = currentDirectory;
		this.input = input;

		this.externalResolve = externalResolve;

		this.reset();
	}

	private reset() {
		this.output = {};
	}

	getNewLine() {
		return '\n';
	}
	useCaseSensitiveFileNames() {
		return false;
	}

	getCurrentDirectory = () => {
		return this.currentDirectory;
	}
	getCanonicalFileName(filename: string) {
		return utils.normalizePath(filename);
	}
	getDefaultLibFilename() {
		return '__lib.d.ts';
	}
	getDefaultLibFileName() {
		return '__lib.d.ts';
	}

	writeFile = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void) => {
		this.output[fileName] = data;
	}

	getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile => {
		if (fileName === '__lib.d.ts') {
			return Host.getLibDefault(this.typescript);
		}

		let sourceFile = this.input.getFile(fileName);
		if (sourceFile) return sourceFile.ts;

		if (this.externalResolve) {
			let text: string;
			try {
				text = fs.readFileSync(fileName).toString('utf8');
			} catch (ex) {
				return undefined;
			}
			this.input.addContent(fileName, text);

			let sourceFile = this.input.getFile(fileName);
			if (sourceFile) return sourceFile.ts;
		}
	}
}
