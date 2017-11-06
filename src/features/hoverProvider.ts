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
import { JSDomConverter, Renderer } from "html2commonmark";

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
    let pi = Utils.getPredicateUnderCursor(doc, position);
    let contents: string[] = Utils.getSnippetDescription(doc, pi);
    return contents === [] ? null : new Hover(contents, wordRange);
  }
  /*   private getHTMLDoc(doc: TextDocument, position: Position): MarkedString[] {
    let pi = Utils.getPredicateUnderCursor(doc, position);
    let keys = Utils.getSnippetKeys(doc, pi);
    let converter = new JSDomConverter();
    let renderer = new Renderer();
    // let str: MarkedString[] = keys.map(key => {
    let str: MarkedString[] = keys.map(key => {
      key += ".html";
      let file = path.join(Utils.REFMANPATH, key);
      let data = fs
        .readFileSync(file, { encoding: "UTF-8" })
        // .replace(/<div[\s\S]+?<\/div>/g, "")
        // .replace(/<audio[\s\S]+?<\/audio>/g, "")
        .replace(/^[\s\S]+<\/head>/, "");
      data = "<html>" + data;
      let htmldoc = new DOMParser().parseFromString(data);
      let txt: string = xpath
        .select(
          "//div[@class='navtop']/following-sibling::*[not(self::div)]",
          htmldoc
        )
        .join("")
        .toString()
        .replace(/(^\s*$){3,}/gm, "");
      let ast = converter.convert(txt);
      let markdown = renderer.render(ast);
      // return txt;

      return {
        language: "logtalk",
        value: markdown
      };
    });

    return str;
  } */
}
