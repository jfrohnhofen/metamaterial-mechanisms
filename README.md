# Metamaterial mechanisms editor

Online editor: [https://jfrohnhofen.github.io/metamaterial-mechanisms/](https://jfrohnhofen.github.io/metamaterial-mechanisms/)

## About this repository
1. Please note that this is **not a product**, but a research prototype. This means that support is limited.
2. If you have issues, please post them in the issues tab here on github (e.g. [installation issues](https://github.com/jfrohnhofen/metamaterial-mechanisms/issues/2)), not via email. In case someone else has the same problem, they can then look up the answer directly.
3. If you need help, please describe the problem you have precisely and which steps you completed, which browser, etc. Without knowing **what** does not work (as opposed to *that* it does not work), it is impossible to help. 
4. Please help each other out. If you know the answer, post it directly.

This is the editor for the research paper [Metamaterial Mechanisms](https://hpi.de/baudisch/projects/metamaterial-mechanisms.html). If you want to print the objects shown in the paper, find them in our [thingiverse collection](http://www.thingiverse.com/HassoPlattnerInstitute_HCI/collections/metamaterial-mechanisms).

<img src="https://hpi.de/fileadmin/_processed_/csm_WEB_door_frontal-01_e7de4434b2.png" width="600" />
<img src="https://hpi.de/fileadmin/_processed_/csm_WEB_editor-01_1d3222effd.png" width="600" />

The editor consists of 2 main components: 

1. the voxel editor (in javascript, thus platform-independent) and 
2. the simulation (on windows only!)

The system implementation is described in our research paper: [https://hpi.de/baudisch/projects/metamaterial-mechanisms.html](https://hpi.de/baudisch/projects/metamaterial-mechanisms.html)


## Editor
You can try the editor here [https://jfrohnhofen.github.io/metamaterial-mechanisms/](https://jfrohnhofen.github.io/metamaterial-mechanisms/). However, the simulation won't work in the online version.

For the full experience, you can download the editor and install it as follows:

1. install [node.js](https://nodejs.org/en/) (tutorial: http://blog.teamtreehouse.com/install-node-js-npm-windows)
2. run ```npm install``` in the root folder of this editor (where package.json lies) **in your command prompt**. 

This will create a folder called 'node_modules' for you. 
If you get an error that git is not found --> then install git (https://www.atlassian.com/git/tutorials/install-git#windows) and make sure it is added to your path variables.

3. start the editor by running the command ```npm start``` in the same directory.



## Simulation (on Windows only)
The simulation works only on Windows, since there is no Grasshopper for Mac. Note that the simulation is computationally expensive and therefore slow. For best results, move the force arrow slowly.  


#### How to install:

1. install [Rhino 5](http://www.rhino3d.com/download)
2. install [Grasshopper](http://www.grasshopper3d.com/page/download-1)
3. install [karamba 1.1.0](http://www.food4rhino.com/app/karamba?etx=)  
    for licence choose "free" (NOT trial), use metric units
4. copy the items from './simulation/bin/' to Grasshopper's Components folder. Find the folder by opening Grasshopper in the File menu 'Special Folders' - 'Components Folder'. (opening Grasshopper: start Rhino and type "grasshopper" into Rhino's command line)

To run the simulation, simply execute the batch script "1-START-SIMULATION.bat". As soon as the simulation is running, it can receive data from the editor.


#### If you don't use Windows, you can install the simulation on some remote Windows-machine: 
You can install the simulation on a remote Windows machines and let the platform-independent editor connect to that machine. The communication works via web sockets. You need to set the IP of the machine that runs the simulation in ./config.json. Both computers have to be in the same network.


##### Troubleshooting: 
If Grasshopper cannot load the InputComponent, then it's dependencies might be blocked. Right-click the two .dll files in your Components folder and tick the checkbox "Unblock". Start the simulation using the batch script again.

<img src="https://www13.hpi.uni-potsdam.de/fileadmin/user_upload/fachgebiete/baudisch/projects/metamaterial/metamaterial-mechanisms/deploy-info--unblock_dll.jpg" width="400" />


##### For developers:
The Grasshopper components are developed in Visual Studio 2012 and they target .NET 4.5. Pre- and post-build events copy the neccessary binaries to the ./simulation/bin/ folder. The C# projects also contain post-build events that additionally copy the 4 binaries directly into the Grasshopper Components folder. Note that these are absolut pahts and need to be ajusted to your system. Furthermore, you can also debug the components by pointing to Rhino.exe in the project settings - Debug - Start external program. (It's already set, but the path might differ on your machine.)
