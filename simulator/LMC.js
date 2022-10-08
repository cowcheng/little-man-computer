class memoryViewer {
    //Memory can be left blank to fill with 0s
    constructor(targetHandle) {
        //To be reset cells
        this.toBeReset = [];

        //Create header for pc and accumulator
        var wrapper = document.createElement("div");
        var header = document.createElement("div");
        header.className = "memoryHeader";

        var pcText = document.createElement("p");
        pcText.className = "pcH1";
        pcText.innerHTML = "PC";
        header.appendChild(pcText);

        var spacer = document.createElement("div");
        spacer.className = "spacer";
        header.appendChild(spacer);

        this.pcDisplay = document.createElement("div");
        this.pcDisplay.className = "programCounter";
        this.pcDisplay.innerHTML = "00";
        header.appendChild(this.pcDisplay);

        spacer = document.createElement("div");
        spacer.className = "bigSpacer";
        header.appendChild(spacer);

        var pcText = document.createElement("p");
        pcText.className = "pcH1";
        pcText.innerHTML = "ACC";
        header.appendChild(pcText);

        spacer = document.createElement("div");
        spacer.className = "spacer";
        header.appendChild(spacer);

        this.accumulator = document.createElement("div");
        this.accumulator.className = "programCounter";
        this.accumulator.innerHTML = "000";
        header.appendChild(this.accumulator);

        //Speed controller
        spacer = document.createElement("div");
        spacer.className = "bigSpacer";
        header.appendChild(spacer);

        var pcText = document.createElement("p");
        pcText.className = "pcH1";
        pcText.innerHTML = "Cycle Time (ms)";
        header.appendChild(pcText);

        spacer = document.createElement("div");
        spacer.className = "spacer";
        header.appendChild(spacer);

        this.speedController = document.createElement("input");
        this.speedController.type = "number";
        this.speedController.value = 100;
        this.speedController.min = 0;
        header.appendChild(this.speedController);

        wrapper.appendChild(header);


        //Create table
        this.table = document.createElement("table");
        var tableBody = document.createElement("tbody");

        //Creating the cells
        for (var y = 0; y < 10; y++) {
            var row = document.createElement("tr");

            for (var x = 0; x < 10; x++) {
                var cell = document.createElement("td");
                cell.className = "memoryCellInactive";

                var cellText = document.createTextNode("000");
                cell.appendChild(cellText);
                row.appendChild(cell);
            }

            tableBody.appendChild(row);
        }

        this.table.appendChild(tableBody);
        wrapper.appendChild(this.table);

        targetHandle.appendChild(wrapper);

    }

    resetView() {
        this.toBeReset = [];

        for (var y = 0; y < 10; y++) {
            for (var x = 0; x < 10; x++) {
                var cell = this.table.rows[y].cells[x];
                cell.className = "memoryCellInactive";
                cell.innerHTML = "000";
            }
        }
    }

    uploadMemory(data) {
        for (var i = 0; i < data.length; i++) {
            this.updateMemory(i, 0, data[i]);
        }
    }

    updateMemory(position, state, value = null) {
        var y = Math.floor(position / 10);
        var x = position - (y * 10);
        var cell = this.table.rows[y].cells[x];

        //0 = SET (No effect apart from setting active visual)
        //1 = READ
        //2 = WRITE
        if (state == 0) {
            cell.className = "memoryCellActive";
        } else if (state == 1 || state == 2) {
            this.toBeReset.push(position); //Add it to reset stack for next iteration

            if (state == 1) {
                cell.className = "memoryCellRead";
            } else {
                cell.className = "memoryCellWrite";
            }
        }

        if (value != null)
            cell.innerHTML = padDigits(value, 3);
    }

    updatePC(value) {
        this.pcDisplay.innerHTML = padDigits(value, 2);
    }

    updateACC(value) {
        this.accumulator.innerHTML = value;
    }

    cleanMemoryView() {
        //Deactivate cells from last instruction
        for (var i = 0; i < this.toBeReset.length; i++) {
            var pos = this.toBeReset[i];
            var _y = Math.floor(pos / 10);
            var _x = pos - (_y * 10);
            this.table.rows[_y].cells[_x].className = "memoryCellActive";
        }
        //clear list
        this.toBeReset = [];
    }
}

var codeEditor = null;
var codeOutput = null;
var codeCompiled = null;

var memoryView = null;

window.onload = function () {
    codeEditor = CodeMirror.fromTextArea(document.getElementById('code'), {
        lineNumbers: true,
        mode: "lmc",
        theme: "harry",
        tabSize: 8,
        indentWithTabs: true,
    });

    codeCompiled = CodeMirror.fromTextArea(document.getElementById('compiled'), {
        lineNumbers: true,
        readOnly: true,
        mode: "lmc",
        theme: "harry",
    });

    codeOutput = CodeMirror.fromTextArea(document.getElementById('output'), {
        readOnly: true,
        theme: "harry",
        mode: "none"
    });

    memoryView = new memoryViewer(document.getElementById('memoryView'));

    codeEditor.setSize(400, 700);
    codeCompiled.setSize(200, 700);
    codeOutput.setSize(null, 150);
}

builtins = 'INP OUT BRA BRZ BRP STA LDA OTC HLT DAT ADD SUB STR LDV';
op_Param = {
    'ADD': '1',
    'SUB': '2',
    'STA': '3',
    'LDA': '5',
    'BRA': '6',
    'BRZ': '7',
    'BRP': '8'
};

op_Cmd = {
    'INP': '901',
    'OUT': '902',
    'OTC': '903',
    'LDV': '400',
    'HLT': '000'
};

class errorCapture {
    constructor(target) {
        this.error_list = [];
        this.target_editor = target;
    }

    createError(code, line, text) {
        this.error_list.push(code + "[Line " + (line + 1) + "]: " + text);
        this.target_editor.addLineClass(line, 'background', 'cm-s-harry-error');
    }
}

class precomp_label {
    constructor() {

    }
}

class precomp_instruction {
    constructor(command, param, line) {
        this.command = command;
        this.param = param;
        this.line = line;
    }
}

function padDigits(number, digits) {

    var signed = false;
    if (String(number).includes("-")) {
        signed = true;
        number = String(number).replace("-", "");
    }
    if (!signed)
        return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
    else
        return "-" + Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}

var runInstance = null;

function overFlow(val) {
    //Modulate memory, simulate over/underflows
    var pol = val > 0 ? -1 : 1;
    while (val > 999 || val < -999) {
        val += (pol) * 1999;
    }

    return val;
}

function code_run() {
    if (current_compiled_instructions != null) {
        //Memory is of size 999 like in the littleman computer
        var memory = new Int16Array(999);

        //Load the program into Memory
        for (var i = 0; i < current_compiled_instructions.length; i++) {
            memory[i] = parseInt(current_compiled_instructions[i]);
        }

        //Runtime emulated variables
        var programCounter = 0;
        var accumulator = 0;

        //Clear Output
        codeOutput.setValue("");

        var codeOutputStr = "";
        var shouldQuit = false;

        //Start runtime loop worker
        runInstance = setInterval(function () {
            //Clean memory view
            memoryView.cleanMemoryView();

            //Fetch
            var cInstruction = padDigits(memory[programCounter], 3);
            programCounter++;

            //Decode & execute the instruction
            if ("000 901 902 903".split(' ').indexOf(cInstruction) >= 0) {
                switch (cInstruction) {
                    case "000": //Quit command
                        stopRunning();
                        shouldQuit = true;
                        break;
                    case "901": //Input command
                        var enteredNum = 0;
                        var eN = false;
                        while (!eN) {
                            var entry = prompt("Integer input -999 to 999:");
                            if (entry.match(/^([0-9]+|-[0-9]+)$/g) != null) {
                                enteredNum = parseInt(entry);
                                eN = true;
                            }
                        }
                        accumulator = enteredNum;
                        break;
                    case "902": //Output commands
                        codeOutputStr = codeOutputStr + accumulator + "\n";
                        codeOutput.setValue(codeOutputStr);
                        break;
                    case "903": //Character output (ascii val)
                        var chr = " ";
                        if (chr <= 128 && chr >= 0)
                            chr = String.fromCharCode(accumulator);

                        codeOutputStr = codeOutputStr + chr;
                        codeOutput.setValue(codeOutputStr);
                        break;
                    default: //Should never happen
                        break;
                }
            } else {
                var opPrfx = parseInt(cInstruction.substring(0, 1));
                var opAddr = parseInt(cInstruction.substring(1, 3));

                switch (opPrfx) {
                    case 1:
                        accumulator += memory[opAddr];
                        memoryView.updateMemory(opAddr, 1);
                        break;
                    case 2:
                        accumulator -= memory[opAddr];
                        memoryView.updateMemory(opAddr, 1);
                        break;
                    case 3:
                        memory[opAddr] = accumulator;
                        memoryView.updateMemory(opAddr, 2, accumulator);
                        break;
                    case 4:
                        memoryView.updateMemory(accumulator, 1);
                        accumulator = memory[accumulator];
                        break;
                    case 5:
                        accumulator = memory[opAddr];
                        memoryView.updateMemory(opAddr, 1);
                        break;
                    case 6:
                        programCounter = opAddr;
                        memoryView.updateMemory(opAddr, 1);
                        break;
                    case 7:
                        if (accumulator == 0) {
                            programCounter = opAddr;
                            memoryView.updateMemory(opAddr, 1);
                        }
                        break;
                    case 8:
                        if (accumulator >= 0) {
                            programCounter = opAddr;
                            memoryView.updateMemory(opAddr, 1);
                        }
                        break;
                    default: //Corrupted memory. Walk over for now
                        break;
                }
            }

            accumulator = overFlow(accumulator);

            //Update ACC and PC
            memoryView.updatePC(programCounter);
            memoryView.updateACC(accumulator);
        }, parseInt(memoryView.speedController.value) >= 0 ? parseInt(memoryView.speedController.value) : 0);
    }
}

function stopRunning() {
    clearInterval(runInstance);
    codeOutput.setValue(codeOutput.getValue() + "\n\nProgram Terminated Correctly\n");
}

var current_compiled_instructions = null;

/* CALLED FROM MAIN HTML FILE */
function code_compile() {
    console.log("Compiling code!");

    var lines = codeEditor.getValue().split('\n');

    var erCap = new errorCapture(codeEditor);

    var collected_instructions = [];
    var instruction_count = 0;

    //Holds a list of precompiled labels
    var detected_labels = {};

    for (var ln = 0; ln < lines.length; ln++) {
        //Remove line error
        codeEditor.removeLineClass(ln, 'background', 'cm-s-harry-error');

        tokens = lines[ln].split(';')[0].match(/\S+/g) || []; //Split the lines into tokens, they are seperated by whitespace. Ignore anything after the comment identifier (;)

        if (tokens.length == 0)
            continue;

        if (!lines[ln].includes('STR'))
            if (tokens.length > 3) {
                erCap.createError("INT00", ln, "Too many statements");
                continue;
            }

        //Try to match a command
        var label = "";
        var command = "";
        var param = "";

        var location = -1;

        for (var i = 0; i < tokens.length; i++) {
            if (builtins.split(' ').indexOf(tokens[i].toUpperCase()) >= 0) {
                command = tokens[i].toUpperCase();
                location = i;
            }
        }

        //Detect parameter overloading
        if (!lines[ln].includes('STR'))
            if (tokens.length - location > 2) {
                erCap.createError("INT01", ln, "Too many paramters");
            }

        //Detected parameter
        if (location + 1 == tokens.length - 1) {
            param = tokens[tokens.length - 1];
        }

        //If we find an instruction
        if (location != -1) {
            if (location <= 1) {
                //Label detected
                if (location == 1) {
                    if (tokens[0] in detected_labels) {
                        erCap.createError("LBL01", ln, "Multiply defined label");
                        continue;
                    }

                    label = tokens[0];
                    detected_labels[tokens[0]] = instruction_count;
                }
            } else {
                erCap.createError("LBL00", ln, "Label incorrectly defined");
                continue;
            }
        } else {
            erCap.createError("CMD00", ln, "No command found");
            continue;
        }

        if (command == "STR") {

            var string = lines[ln].split('\'')[1];


            for (var i = 0; i < string.length; i++) {
                collected_instructions.push(new precomp_instruction("DAT", string.charCodeAt(i), ln));
                instruction_count += 1;
            }

            collected_instructions.push(new precomp_instruction("DAT", 0, ln));
            instruction_count += 1;
        } else {
            //Add the instruction to the collected instruction list
            collected_instructions.push(new precomp_instruction(command, param, ln));

            //On a correctly compiled version, this value will be correct
            instruction_count += 1;
        }
    }

    //Check for undefined label references on instructions that require an address
    for (var i = 0; i < collected_instructions.length; i++) {
        //'INP OUT BRA BRZ BRP STA LDA OTC HLT DAT ADD SUB
        if (collected_instructions[i].command in op_Param) {
            var testParam = collected_instructions[i].param;

            if (testParam == null || testParam == "") {
                erCap.createError("CMD01", collected_instructions[i].line, "Command requires address parameter");
            } else {
                //See if its a numeric address
                if (testParam.match(/^[0-9]+$/) == null) {
                    //Otherwise look in the detected labels
                    if (!(testParam in detected_labels)) {
                        //Nope, couldn't find it there either
                        erCap.createError("LBL02", collected_instructions[i].line, "Undefined label reference");
                    }
                }
            }
        }
    }

    if (erCap.error_list.length > 0) {
        var build = "Build failed...\n";
        for (var i = 0; i < erCap.error_list.length; i++)
            build = build + erCap.error_list[i] + "\n";

        //Default to simply halt execution
        codeCompiled.setValue("HLT 000");
        codeOutput.setValue(build);

        current_compiled_instructions = null;
    } else {
        //We have all the elements we need and are ready to compile it
        var compiled_instructions = [];

        var dispText = "";

        for (var i = 0; i < collected_instructions.length; i++) {
            var instruction = collected_instructions[i];
            //console.log("Location: " + i + " Command: " + instruction.command + " Param: " + instruction.param);

            //Encode opcode
            var opcode = "";

            //This instruction requires the parameter value
            if (instruction.command in op_Param) {
                var param = instruction.param;

                //Convert label reference to address
                if (param.match(/^[0-9]+$/) == null)
                    param = detected_labels[param];

                opcode = op_Param[instruction.command] + padDigits(param + 1, 2);
            }
            //Single statement commands
            else if (instruction.command in op_Cmd) {
                opcode = op_Cmd[instruction.command];
            }
            //Data storage; save the parameter as the memory
            else {
                opcode = padDigits(instruction.param, 3);
            }

            //Add it to the program
            compiled_instructions.push(opcode);

            dispText = dispText + instruction.command + " " + opcode + "\n";
        }
        codeCompiled.setValue(dispText);
        codeOutput.setValue("Build succeeded!");

        memoryView.resetView();
        memoryView.uploadMemory(compiled_instructions);

        current_compiled_instructions = compiled_instructions;
    }
}
