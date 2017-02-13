@ECHO OFF
echo current directory: %~dp0
echo loading Rhinoceros and Grasshopper. 
echo starting simulation
cd %~dp0
"C:\Program Files\Rhinoceros 5 (64-bit)\System\Rhino.exe" /nosplash /runscript="-grasshopper editor load document open metamaterial-simulation.gh _enter"