("use strict");
import { spawn } from "process-promises";
import {
  CancellationToken,
  CodeActionContext,
  CodeActionProvider,
  Command,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  ExtensionContext,
  languages,
  OutputChannel,
  Position,
  Range,
  Selection,
  TextDocument,
  TextEditorRevealType,
  Uri,
  window,
  workspace,
  WorkspaceEdit
} from "vscode";
import { basename } from "path";

export default class LogtalkLinter implements CodeActionProvider {
  private diagnosticCollection: DiagnosticCollection;
  private diagnostics: { [docName: string]: Diagnostic[] } = {};
  private filePathIds: { [id: string]: string } = {};
  private sortedDiagIndex: { [docName: string]: number[] } = {};
  private msgRegex = /([^:]+):\s*([^:]+):(\d+):((\d+):)?((\d+):)?\s*([\s\S]*)/;
  private executable: string;
  private documentListener: Disposable;
  private openDocumentListener: Disposable;
  private outputChannel: OutputChannel = null;

  constructor(private context: ExtensionContext) {
    this.executable = null;
  }

  provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    token: CancellationToken
  ): Command[] | Thenable<Command[]> {
    let codeActions: Command[] = [];
    return codeActions;
  }
  private parseIssue(issue: string) {
    let match = issue.match(this.msgRegex);
    if (match == null) return null;
    let fileName = this.filePathIds[match[2]]
      ? this.filePathIds[match[2]]
      : match[2];
    let severity: DiagnosticSeverity;
    if (match[1] == "ERROR") severity = DiagnosticSeverity.Error;
    else if (match[1] == "Warning") severity = DiagnosticSeverity.Warning;
    let line = parseInt(match[3]) - 1;
    // move up to above line if the line to mark error is empty
    line = line < 0 ? 0 : line;
    let fromCol = match[5] ? parseInt(match[5]) : 0;
    fromCol = fromCol < 0 ? 0 : fromCol;
    let toCol = match[7] ? parseInt(match[7]) : 200;
    let fromPos = new Position(line, fromCol);
    let toPos = new Position(line, toCol);
    let range = new Range(fromPos, toPos);
    let errMsg = match[8];
    let diag = new Diagnostic(range, errMsg, severity);
    if (diag) {
      if (!this.diagnostics[fileName]) {
        this.diagnostics[fileName] = [diag];
      } else {
        this.diagnostics[fileName].push(diag);
      }
    }
  }

  private doPlint(textDocument: TextDocument) {
    if (textDocument.languageId != "logtalk") {
      return;
    }
    this.diagnostics = {};
    this.sortedDiagIndex = {};
    this.diagnosticCollection.delete(textDocument.uri);
    let options = workspace.rootPath
      ? { cwd: workspace.rootPath, encoding: "utf8" }
      : undefined;

    let args: string[] = [],
      goals: string = `logtalk_load('${textDocument.fileName}').`;
    let lineErr: string = "";

    let child = spawn(this.executable, args, options)
      .on("process", process => {
        if (process.pid) {
          process.stdin.write(goals);
          process.stdin.end();
          this.outputChannel.clear();
        }
      })
      .on("stdout", out => {
        // console.log("lintout:" + out + "\n");
      })
      .on("stderr", (errStr: string) => {
        // console.log("linterr: " + errStr);
        if (lineErr === "") {
          let type: string;
          let regex = /^(\*|\!)\s*(.+)/;
          let match = errStr.match(regex);
          if (match) {
            if (match[1] === "*") {
              type = "Warning";
            }
            if (match[1] === "!") {
              type = "ERROR";
            }
            lineErr = type + ":" + match[2];
          }
        } else if (/in file/.test(errStr)) {
          let regex = /in file (\S+).+lines?\s+(\d+)/;
          let match = errStr.match(regex);
          let errMsg: string;
          if (match) {
            lineErr = lineErr.replace(":", `:${match[1]}:${match[2]}:0:200:`);
            this.parseIssue(lineErr + "\n");
            lineErr = "";
          }
        }
      })
      .then(result => {
        if (lineErr) {
          this.parseIssue(lineErr + "\n");
        }
        for (let doc in this.diagnostics) {
          let index = this.diagnostics[doc]
            .map((diag, i) => {
              return [diag.range.start.line, i];
            })
            .sort((a, b) => {
              return a[0] - b[0];
            });
          this.sortedDiagIndex[doc] = index.map(item => {
            return item[1];
          });
          this.diagnosticCollection.set(Uri.file(doc), this.diagnostics[doc]);
        }
        this.outputChannel.clear();
        for (let doc in this.sortedDiagIndex) {
          let si = this.sortedDiagIndex[doc];
          for (let i = 0; i < si.length; i++) {
            let diag = this.diagnostics[doc][si[i]];
            let severity =
              diag.severity === DiagnosticSeverity.Error ? "ERROR" : "Warning";
            let msg = `${basename(doc)}:line:${diag.range.start.line +
              1}:\t${severity}:\t${diag.message}\n`;
            this.outputChannel.append(msg);
          }
          if (si.length > 0) {
            this.outputChannel.show(true);
          }
        }
      })
      .catch(error => {
        let message: string = null;
        if ((<any>error).code === "ENOENT") {
          message =
            "Cannot lint the logtalk file. The Logtalk executable was not found. Use the 'logtalk.executablePath' setting to configure";
        } else {
          message = error.message
            ? error.message
            : `Failed to run logtalk executable using path: ${this
                .executable}. Reason is unknown.`;
        }
        this.outputMsg(message);
      });
  }

  private loadConfiguration(): void {
    let section = workspace.getConfiguration("logtalk");
    if (section) {
      this.executable = section.get<string>("executablePath", "logtalk");
      if (this.documentListener) {
        this.documentListener.dispose();
      }
      if (this.openDocumentListener) {
        this.openDocumentListener.dispose();
      }
    }

    this.openDocumentListener = workspace.onDidOpenTextDocument(e => {
      this.triggerLinter(e);
    });

    this.documentListener = workspace.onDidSaveTextDocument(this.doPlint, this);

    workspace.textDocuments.forEach(this.triggerLinter, this);
  }

  private triggerLinter(textDocument: TextDocument) {
    if (textDocument.languageId !== "logtalk") {
      return;
    }
    this.doPlint(textDocument);
  }

  public activate(): void {
    let subscriptions: Disposable[] = this.context.subscriptions;
    this.diagnosticCollection = languages.createDiagnosticCollection();

    workspace.onDidChangeConfiguration(
      this.loadConfiguration,
      this,
      subscriptions
    );
    this.loadConfiguration();
    if (this.outputChannel === null) {
      this.outputChannel = window.createOutputChannel("LogtalkLinter");
      this.outputChannel.clear();
    }
    workspace.onDidOpenTextDocument(this.doPlint, this, subscriptions);
    workspace.onDidCloseTextDocument(
      textDocument => {
        this.diagnosticCollection.delete(textDocument.uri);
      },
      null,
      subscriptions
    );
  }

  private outputMsg(msg: string) {
    this.outputChannel.append(msg + "\n");
    this.outputChannel.show(true);
  }

  public dispose(): void {
    this.documentListener.dispose();
    this.openDocumentListener.dispose();
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
  }

  public nextErrLine() {
    this.gotoErrLine(0);
  }
  public prevErrLine() {
    this.gotoErrLine(1);
  }

  private gotoErrLine(direction: number) {
    //direction: 0: next, 1: previous
    const editor = window.activeTextEditor;
    let diagnostics = this.diagnosticCollection.get(editor.document.uri);
    if (!diagnostics || diagnostics.length == 0) {
      this.outputMsg("No errors or warnings :)");
      return;
    }
    this.outputChannel.clear();
    const activeLine = editor.selection.active.line;
    let position: Position, i: number;
    let si = this.sortedDiagIndex[editor.document.uri.fsPath];

    if (direction === 0) {
      i = 0;
      if (activeLine >= diagnostics[si[si.length - 1]].range.start.line) {
        position = diagnostics[si[0]].range.start;
      } else {
        while (diagnostics[si[i]].range.start.line <= activeLine) {
          i = i === si.length - 1 ? 0 : i + 1;
        }
        position = diagnostics[si[i]].range.start;
      }
    } else {
      i = si.length - 1;
      if (activeLine <= diagnostics[si[0]].range.start.line) {
        position = diagnostics[si[i]].range.start;
      } else {
        while (diagnostics[si[i]].range.start.line >= activeLine) {
          i = i === 0 ? si.length - 1 : i - 1;
        }
        position = diagnostics[si[i]].range.start;
      }
    }
    editor.revealRange(diagnostics[si[i]].range, TextEditorRevealType.InCenter);

    diagnostics.forEach(item => {
      if (item.range.start.line === position.line) {
        let severity =
          item.severity === DiagnosticSeverity.Error
            ? "ERROR:\t\t"
            : "Warning:\t";
        this.outputChannel.append(severity + item.message + "\n");
      }
    });
    editor.selection = new Selection(position, position);
    this.outputChannel.show(true);
  }
}
