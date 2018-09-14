# RML Parse #

#### Extended Backus-Naur Form (EBNF) Description of RML: ####
```
music = sequence, [":", music] ;
sequence = {chord | note | shape | rest | octave-shift | repeat} ;
chord = "[", {note | shape | octave-shift}, "]", [{"~"}] ;
shape = "<", {note}, ">" ;
note = (digit | "T" | "E"), [{"~"} | {"'"}] ;
octave-shift = "v" | "^" ;
repeat = "*", digit ;
rest = "-", ["'"] ;
digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```