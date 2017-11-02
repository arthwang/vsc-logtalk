:- use_module(library(pldoc)).
:- use_module(library(pldoc/doc_html)).
:- use_module(library(pldoc/doc_process)).
:- use_module(library(regex)).
:- use_module(library(http/json)).
:- use_module(library(sgml)).
:- use_module(library(xpath)).
:- use_module(library(regex)).
:- use_module(library('dialect/ifprolog')).


:- dynamic html_file/1.

doc_root("http://localhost/logtalk3doc/refman/").

gen_snippets :-
    nb_linkval(snippets_dict, _{}),
    retractall(html_file(_)),
    read_json("../../snippets/snippets.json"),
    handle_directives,
    Others = ["predicates", "methods" , "control"],
    foreach(member(SubDir, Others), handle_other(SubDir)),
    write_to_json("../../snippets/logtalk.json"), !.


    
% Type: "directives", "predicates", "methods" and "control"
doc_htmls(Type, HtmlLst) :-
    retractall(html_file(_)),
    doc_root(DocRoot),
    string_concat(DocRoot, Type, Root),
    load_html(Root, Dom, []),
    doc_htmls(Dom),
    findall(Html, html_file(Html), HtmlLst).
doc_htmls(Dom) :-
    xpath(Dom, //td/a(text), Html),
    Html =~ "^[a-z].+\\.html$",
    assert(html_file(Html)),
    fail.
doc_htmls(_).
    
handle_other(SubDir):-
    doc_htmls(SubDir, Htmls),
    foreach(member(File, Htmls), 
        catch(handle_document(SubDir, File), _, true)).

handle_directives :-
    doc_htmls("directives", Htmls1),
    exclude(handled_directives, Htmls1, Htmls),
    foreach(member(File, Htmls), catch(handle_document("directives", File), _, true)).
handle_document(SubDir, Html) :-
    doc_root(Root),
    atomic_list_concat([Root, SubDir, "/", Html], Page),
    load_html(Page, Dom, []),
    writeln(Page),
    once(xpath(Dom, //h2(text), PI)),
    PI=~"^[a-z]",
    atomic_list_concat([SubDir, ":", PI], Key),
    (   split_string(PI, "/", "/", [DirecName, Arity])
    ;   split_string(PI, "//", "//", [DirecName, Arity])
    ),
    xpath(Dom, //pre(text), Codes),
    split_string(Codes, "\n", " ", [Code|_]),
    gen_body(Code, Arity, BodyLst),
    atomic_list_concat(BodyLst, ", ", Body1),
    (   Arity="0"
    ->  atomic_list_concat([DirecName, Body1], FullBody1)
    ;   atomic_list_concat([DirecName, "(", Body1, ")"], FullBody1)
    ),
    (   SubDir=="directives"
    ->  atomic_list_concat([":- ", FullBody1, ".\n"], FullBody)
    ;   atom_concat(FullBody1, "$0\n", FullBody)
    ),
    xpath(Dom, //p(text), Desc),
    xpath(Dom, //pre(2, text), Mode),
    atomic_list_concat(["Template and modes\n", Mode, "\n\nDescription", Desc],
                       FullDesc),
    (   SubDir=="directives"
    ->  atom_concat(":- ", DirecName, Prefix)
    ;   Prefix=DirecName
    ),
    dict_create(Dict,
                _,
                
                [ prefix:Prefix,
                  body:FullBody,
                  description:FullDesc,
                  scope:"source.logtalk"
                ]),
    add_to_dict(Key, Dict), !.
handle_document(_, _).

gen_body(_, "0", ["$0"]) :- !.
gen_body(Code, _, Body) :-
    index(Code, "(", I),
    sub_string(Code, I, _, 1, Params),
    split_string(Params, ",", "\s", PLst),
    gen_body1(PLst, 1, Body).
gen_body1([H|T], I, [Stop|BT]) :-
    atomic_list_concat(["${", I, ":", H, "}"], Stop),
    I1 is I+1,
    gen_body1(T, I1, BT).
gen_body1([], _, []).
    

handled_directives(Item) :-
    (   Item=~"^object"
    ;   Item=~"^category"
    ;   Item=~"^protocol"
    ;   Item=~"^end"
    ).

read_json(JsonFile) :-
    open(JsonFile, read, Stream),
    json_read_dict(Stream, Dict),
    close(Stream),
    nb_linkval(snippets_dict, Dict).
    
write_to_json(JsonFile) :-
    nb_getval(snippets_dict, Dict),
    open(JsonFile, write, Stream),
    json_write_dict(Stream, Dict),
    close(Stream).

add_to_dict(Key, NewSnippet):-
    nb_getval(snippets_dict, DictIn),
    put_dict(Key, DictIn, NewSnippet, DictOut),
    nb_linkval(snippets_dict, DictOut).
    
