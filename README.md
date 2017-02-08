# Metamaterial mechanisms editor

![alt text](https://hpi.de/fileadmin/_processed_/csm_WEB_door_frontal-01_e7de4434b2.png "door")
![alt text](https://hpi.de/fileadmin/_processed_/csm_WEB_editor-01_1d3222effd.png "editor")

The editor consists of 2 main components: 

1. the voxel editor (in javascript, thus platform-independent) and 
2. the simulation (on windows only!)

**For developers:** the system implementation is described in our research paper: [https://hpi.de/baudisch/projects/metamaterial-mechanisms.html](https://hpi.de/baudisch/projects/metamaterial-mechanisms.html)

Please note that this is a research prototype implementation. Feel free to add and discuss issues in the discussion board and to help each other out. 



## Editor
The entry point of the editor is located in the folder 'voxel-editor'. 

1. install [node.js](https://nodejs.org/en/)
2. change to the folder 'voxel-editor' and 
4. run 
```
    npm install
```. 
This will create a folder 'node_modules' that contains all dependencies.

3. run the editor with
```
npm start
```



simulation URL - needs to match the one in gh

test objects in models

We use webGL 2, THREE.js, node.js, ...


## Simulation (on Windows only)
The simulation works only on Windows, since there is no Grasshopper for Mac. 

##### How to install:

1. install [Rhino 5](http://www.rhino3d.com/download)
2. install [Grasshopper](http://www.grasshopper3d.com/page/download-1)
3. install [karamba 1.1.0](http://www.food4rhino.com/app/karamba?etx=)


copy files metamaterial simulation files to grasshopper folder



###### If you don't use Windows: 
You can install the simulation on a remote Windows machines and let the platform-independent editor connect to that machine. The communication works via web sockets. You need to set the set the IP of your remote machine in 'simulationURL.json'. You can set the editor's IP in Grasshopper directly.


