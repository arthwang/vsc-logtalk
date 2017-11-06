"use strict";

import {
  HoverProvider,
  TextDocument,
  Position,
  CancellationToken,
  Hover,
  Range,
  MarkedString
} from "vscode";
import { Utils } from "../utils/utils";
import * as fs from "fs";
import * as path from "path";
import * as xpath from "xpath";
import { DOMParser } from "xmldom";

export default class LogtalkHoverProvider implements HoverProvider {
  public provideHover(
    doc: TextDocument,
    position: Position,
    token: CancellationToken
  ): Hover {
    let wordRange: Range = doc.getWordRangeAtPosition(position);
    if (!wordRange) {
      return;
    }
    let contents: MarkedString[] = this.getHTMLDoc(doc, position);
    return contents === [] ? null : new Hover(contents, wordRange);
  }
  private getHTMLDoc(doc: TextDocument, position: Position): MarkedString[] {
    let pi = Utils.getPredicateUnderCursor(doc, position);
    let keys = Utils.getSnippetKeys(doc, pi);
    // let str: MarkedString[] = keys.map(key => {
    let str: string[] = keys.map(key => {
      key += ".html";
      let file = path.join(Utils.REFMANPATH, key);
      let data = fs.readFileSync(file, { encoding: "UTF-8" });
      let htmldoc = new DOMParser().parseFromString(data);
      let txt: string = xpath
        .select("//*[not(name()='div')]/text()", htmldoc)
        .join("")
        .toString()
        .replace(/^\s*$/gm, "");
      return txt;
      // return {
      //   language: "logtalk",
      //   value: txt
      // };
    });

    return str;
  }
}
