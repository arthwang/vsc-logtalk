import {
  TextDocument,
  Position,
  Range,
  ExtensionContext,
  workspace,
  window
} from "vscode";
interface ISnippet {
  [predIndicator: string]: {
    prefix: string;
    body: string[];
    description: string;
  };
}
import * as fs from "fs";
import * as cp from "child_process";
import * as jsesc from "jsesc";
// import * as path from "path";
export class Utils {
  private static snippets: ISnippet = null;
  public static CONTEXT: ExtensionContext | null = null;
  public static RUNTIMEPATH: string = "logtalk";
  public static DEFAULTMODULES: string[];
  public static REFMANPATH: string;

  constructor() {}
  public static init(context: ExtensionContext) {
    Utils.CONTEXT = context;
    Utils.REFMANPATH = `${process.env.LOGTALKHOME}/manuals/refman/`;

    Utils.RUNTIMEPATH = workspace
      .getConfiguration("logtalk")
      .get<string>("executablePath", "logtalk");
    Utils.loadSnippets(context);
  }

  private static loadSnippets(context: ExtensionContext) {
    if (Utils.snippets) {
      return;
    }
    let snippetsPath = context.extensionPath + "/snippets/logtalk.json";
    let snippets = fs.readFileSync(snippetsPath, "utf8").toString();
    Utils.snippets = JSON.parse(snippets);
  }
  // public static getPredDescriptions(pred: string): string {
  //   const docTxt = window.activeTextEditor.document.getText();
  //   let descs: string = "";
  //   const re = new RegExp("^\\w+:" + pred);
  //   for (let key in Utils.snippets) {
  //     if (re.test(key)) {
  //       let mod = key.split(":")[0];
  //       if (
  //         new RegExp("import\\s+.*\\b" + mod + "\\b").test(docTxt) ||
  //         Utils.DEFAULTMODULES.indexOf(mod) > -1
  //       ) {
  //         descs +=
  //           key.replace(":", ".") + ":" + Utils.snippets[key].description;
  //       }
  //     }
  //   }
  //   return descs;
  // }
  public static getPredicateUnderCursor(
    doc: TextDocument,
    position: Position
  ): string {
    let wordRange: Range = doc.getWordRangeAtPosition(position);
    if (!wordRange) {
      return null;
    }
    let arity = 0;
    let name = doc.getText(wordRange);
    let re = new RegExp("^" + name + "\\(");
    let text = doc
      .getText()
      .split("\n")
      .slice(position.line)
      .join("")
      .slice(wordRange.start.character)
      .replace(/\s+/g, " ");
    if (re.test(text)) {
      let i = text.indexOf("(") + 1;
      let matched = 1;
      while (matched > 0) {
        if (text.charAt(i) === "(") {
          matched++;
          i++;
          continue;
        }
        if (text.charAt(i) === ")") {
          matched--;
          i++;
          continue;
        }
        i++;
      }
      let wholePred = jsesc(text.slice(0, i), { quotes: "double" });

      let pp = cp.spawnSync(Utils.RUNTIMEPATH, [], {
        cwd: workspace.rootPath,
        encoding: "utf8",
        input: `functor(${wholePred}, N, A), write(name=N;arity=A).`
      });
      if (pp.status === 0) {
        let out = pp.stdout.toString();
        let match = out.match(/name=(\w+);arity=(\d+)/);
        if (match) {
          [name, arity] = [match[1], parseInt(match[2])];
        }
      } else {
        console.log(pp.stderr.toString());
      }
    }
    return name + "/" + arity;
  }
}
