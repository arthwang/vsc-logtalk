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

  constructor() {}

  public static init(): Disposable {
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
    let goals = `set_logtalk_flag(report,warnings),ignore(logtalk_load('${file}')).`;
    LogtalkTerminal.sendString(goals);
  }

  public static runUnitTest() {
    LogtalkTerminal.createLogtalkTerm();
    const file = path.join(workspace.rootPath, "tester");
    let goals = `ignore(logtalk_load('${file}')).`;
    LogtalkTerminal.sendString(goals);
  }

  public static runDoclet() {
    LogtalkTerminal.createLogtalkTerm();
    const file = path.join(workspace.rootPath, "doclet");
    let goals = `logtalk_load(doclet(loader)),ignore(logtalk_load('${file}')).`;
    LogtalkTerminal.sendString(goals);
  }

  public static genHtmlDoc(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    const file: string = LogtalkTerminal.ensureFile(uri);
    const dir = path.dirname(file);
    const xmlDir = path.join(dir, "xml_docs");
    let goals = `logtalk_load(lgtdoc(loader)),logtalk_load('${file}'),os::change_directory('${dir}'),lgtdoc::directory('${dir}').`;
    LogtalkTerminal.sendString(goals);
    cp.execSync("lgt2html && code index.html", { cwd: xmlDir });
  }

  public static genSVGDiagrams(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    const file: string = LogtalkTerminal.ensureFile(uri);
    const dir = path.dirname(file);
    let goals = `logtalk_load(diagrams(loader)),logtalk_load('${file}'),os::change_directory('${dir}'),diagrams::directory('${dir}').`;
    LogtalkTerminal.sendString(goals);
    cp.execSync(
      'for f in *.dot; do dot -Tsvg "$f" > "$(basename "$f" .dot).svg" || continue; done',
      { cwd: dir }
    );
  }
  public static scanForDeadCode(uri: Uri) {
    LogtalkTerminal.createLogtalkTerm();
    const file: string = LogtalkTerminal.ensureFile(uri);
    let goals = `set_logtalk_flag(report, warnings),ignore(logtalk_load('${file}')),flush_output,logtalk_load(dead_code_scanner(loader)),dead_code_scanner::all.`;
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
}
