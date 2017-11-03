# VSC-Logtalk
A VS Code extension which provides language support for Logtalk.

___________________
  [Features](#features) | [Configurations](#configurations) | [Bug Reporting](https://github.com/arthwang/vsc-logtalk/issues) | [Donation](#donation)
__________________

## Note before installation

This extension can be installed via extensions viewlet of VS Code or 'Extensions: install extension' command from the command palette. The author notices that it is developed and tested in ***logtalk 3.12.0*** and ***VS Code 1.17*** on ***Debian 9.0*** (stretch). It's not yet tested under other environments.

## Features
  * [Syntax highlighting](#syntax-highlighting)
  * [Snippets](#indentation-snippets-and-auto-completion)
  * [Grammar Linter](#grammar-linter)
  * [Commands](#commands)

## Feature descriptions and usages
  
### syntax highlighting

  * Prolog like syntax highlighting
  * Built-ins pattern support

### Indentation, snippets and auto-completion

  * Indentation after new line
  * Built-in directive, method and predicate template auto-completion
  * Auto-complete recursive parameters:  When '.'(dot) occures as first non-space character, VSC-Logtalk will repeat the nearest above head of clause and automatically change the parameters if possible.
  
   > Note: Relations between entities use choice snippets. 'orel' triggers object relation choices and 'crel' for category. There is only one relation between protocols 'extends', so 'ext' will trigger the snippet.
   
   > The snippets for built-ins all are triggered by natural prefix, i.e. ':- public' triggers ':- public()' directive. You needn't to type all charaters to show up the suggestion list.

   > Refter to the table below for other snippets:

| Prefix  | Description | 
| -------: | ------- |
|  :- obj | Object |
|  :- cat | Category |
|  :- pro | Protocol |
|  orel | relations between objects(choice) |
|  crel | relations between categories(choice) |
|  ext | relations between categories |
|  category | Category with protocol |
|  category | Category |
|  class | Class with all |
|  class | Class with category |
|  class | Class with metaclass |
|  class | Class with protocol |
|  class | Class |
|  category | Complementing category |
|  category | Extended category |
|  protocol | Extended protocol |
|  instance | Instance with all |
|  instance | Instance with category |
|  instance | Instance with protocol |
|  instance | Instance |
|  private | (with no arguments) |
|  private | Private predicate |
|  protected | (with no arguments) |
|  protected | Protected predicate |
|  protocol | Protocol |
|  object | Prototype with all |
|  object | Prototype with category |
|  object | Prototype with parent |
|  object | Prototype with protocol |
|  object | Prototype |
|  public | (with no arguments) |
|  public | Public predicate |

  ![snippets](images/snippets.gif)

### Grammar linter
  * The grammar errors (if any) will display in OUTPUT channel when active source file is saved.
  
  * Command 'Goto next/previous error': see section Commands below. 

  ![linter](images/linter.gif)


### Commands

#### Project specified commands
  Project specified commands can be triggered from command palette via entering 'logtalk' to pop up the list of all commands of VSC-Logtalk.

| Command | Description | Key binding |
| ----: | :---- | :---- |
| Open logtalk | Open logtalk in an integrated terminal | alt-x o |
| Run unit test | Run the tester file under the project root directory | alt-x t |
| Run doclet | Run the doclet file under the project root directory | |

### Source file specified commands
  These commands can be triggered from editor/context and explorer/context menus via right click editor area or lgt files in explorer area respectively. In explorer context, the file name at which right click occurs will be passed in the command as argument. File specified commands can also be triggered from command palette so that active file name in the editor will be passed in the command.


| Command | Description | Key binding |
|----:|:-----|:----|
| Load document | Load active source file to logtalk process | F9 |
| Goto next/previous error line | Locate cursor to the nearest line with error/warning from current cursor location and the corresponding error/warning message displays in output channel | F7/shift-F7 |
| Scan dead codes | Scan active file for dead codes ||
| Generate HTML document | Generate HTML document for active file ||
| Generate SVG diagrams | Generate SVG diagrams for active file ||

  * Command 'Logtalk: load document' 

  ![loader](images/loader.gif)

## Configurations
  
  * The user can configure settings via VS Code menu File/Preferences/Settings.  Entering 'logtalk' in the input box will show up logtalk settings. There are only two settings in this extension with default values:
    * "logtalk.executablePath": "/usr/bin/logtalk",
      This setting points to the Logtalk executable. Use real path to the executable i.e. swilgt.sh if symbolic link doesn't run in VSC-Logtalk.

    * "logtalk.terminal.runtimeArgs": [],
      Arguments of Logtalk executable run in terminal.

## Bug reporting

  Feel free to report bugs or suggestions via [issues](https://github.com/arthwang/vsc-logtalk/issues)

## Contributions

  [Pull requests](https://github.com/arthwang/vsc-logtalk/pulls) are welcome.

## Acknowledgements
  The author of this extension thanks Professor Paulo Moura who is the author of Logtalk for his patient helps and supports. Syntax tmLanguage, some snippets and some commands are integrated from his distro of Logtalk.

## License

  [MIT](http://www.opensource.org/licenses/mit-license.php)

## Donation

  >If this extension works well for you, would you please donate a loaf of bread to encourage me, a freelance programmer, to spend more time to improve it. Any amount is greatly appreciated.

   [PayPal](https://paypal.me/ArthurWang9)