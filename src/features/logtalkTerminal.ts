"use strict";

import {
  Terminal,
  window,
  workspace,
  TextDocument,
  Disposable,
  OutputChannel,
  TextEditor,
  Uri
} from "vscode";
import * as path from "path";
import * as jsesc from "jsesc";
import * as cp from "child_process";
import LogtalkLinter from "./logtalkLinter";

export default class LogtalkTerminal {
  private static _terminal: Terminal;
  private static _document: TextDocument;
  private static _docletExec: string;
  private static _docletArgs: string[];
  private static _graphvizExec: string;
  private static _graphvizArgs: string[];

  constructor() {}

  public static init(): Disposable {
    let section = workspace.getConfiguration("logtalk");
    LogtalkTerminal._docletExec = section.get<string>(
      "lgtdoc.script",
      "lgt2html"
    );
    LogtalkTerminal._docletArgs = section.get<string[]>("lgtdoc.arguments");
    LogtalkTerminal._graphvizExec = section.get<string>(
      "graphviz.executable",
      "dot"
    );
    LogtalkTerminal._graphvizArgs = section.get<string[]>("graphviz.arguments");
    return (<any>window).onDidCloseTerminal(terminal => {
      LogtalkTerminal._terminal = null;
      terminal.dispose();
    });
  }

  private static createLogtalkTerm() {
    if (LogtalkTerminal._terminal) {
      return;
    }

    let section = workspace.getConfiguration("logtalk");
    if (section) {
      let executable = jsesc(section.get<string>("executablePath", "logtalk"));
      let args = section.get<string[]>("terminal.runtimeArgs");
      LogtalkTerminal._terminal = (<any>window).createTerminal(
        "Logtalk",
        executable,
        args
      );
    } else {
      throw new Error("configuration settings error: logtalk");
    }
  }

  public static sendString(text: string) {
    LogtalkTerminal.createLogtalkTerm();
    LogtalkTerminal._terminal.sendText(text);
    LogtalkTerminal._terminal.show(false);
  }

  public static openLogtalk() {
    LogtalkTerminal.createLogtalkTerm();
    LogtalkTerminal._terminal.show(true);
  }

  public static loadDocument(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    const file: string = LogtalkTerminal.ensureFile(uri);
    let goals = `set_logtalk_flag(report,warnings),logtalk_load('${file}').`;
    LogtalkTerminal.sendString(goals);
  }

  public static runUnitTest(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    let dir: string;
    if (uri && uri.fsPath) {
      dir = path.dirname(uri.fsPath);
    } else {
      dir = workspace.rootPath;
    }
    const testfile = path.join(dir, "tester");
    let goals = `logtalk_load('${testfile}').`;
    LogtalkTerminal.sendString(goals);
  }

  public static runDoclet(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    let dir: string = LogtalkTerminal.ensureDir(uri);
    const docfile = path.join(dir, "doclet");
    let goals = `logtalk_load(doclet(loader)),logtalk_load('${docfile}').`;
    LogtalkTerminal.sendString(goals);
  }

  public static genHtmlDoc(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    let dir: string = LogtalkTerminal.ensureDir(uri);
    const xmlDir = path.join(dir, "xml_docs");
    let goals = `logtalk_load(lgtdoc(loader)),lgtdoc::directory('${dir}').`;
    LogtalkTerminal.sendString(goals);

    cp.execSync(
      `${LogtalkTerminal._docletExec} ${LogtalkTerminal._docletArgs.join(
        " "
      )} && code index.html`,
      { cwd: xmlDir }
    );
  }

  public static genSVGDiagrams(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    let dir: string = LogtalkTerminal.ensureDir(uri);
    let goals = `logtalk_load(diagrams(loader)),diagrams::directory('${dir}').`;
    LogtalkTerminal.sendString(goals);
    cp.execSync(
      `for f in *.dot; do ${LogtalkTerminal._graphvizExec} ${LogtalkTerminal._graphvizArgs.join(
        " "
      )} "$f" > "$(basename "$f" .dot).svg" || continue; done`,
      { cwd: dir }
    );
  }
  public static scanForDeadCode(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    const file: string = LogtalkTerminal.ensureFile(uri);
    let goals = `set_logtalk_flag(report, warnings),logtalk_load('${file}'),flush_output,logtalk_load(dead_code_scanner(loader)),dead_code_scanner::all.`;
    LogtalkTerminal.sendString(goals);
  }

  private static ensureFile(uri: Uri): string {
    let file: string;
    if (uri && uri.fsPath) {
      file = uri.fsPath;
    } else {
      file = window.activeTextEditor.document.fileName;
    }
    return file;
  }

  private static ensureDir(uri: Uri): string {
    let dir: string;
    if (uri && uri.fsPath) {
      dir = path.dirname(uri.fsPath);
    } else {
      dir = workspace.rootPath;
    }
    return dir;
  }
}
