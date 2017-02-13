using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using Grasshopper.Kernel;
using Newtonsoft.Json.Linq;
using Rhino.Geometry;
using WebSocketSharp.Server;

namespace MetamaterialSimulationInput
{
    public class InputComponent : GH_Component
    {
        private WebSocketServer _socketServer;

        private bool _isMeshDataSet;
        private bool _isAnchorDataSet;
        private bool _isForceDataSet;

        private MeshData _meshData;
        private AnchorData _anchorData;
        private ForceData _forceData;

        public MeshData MeshData
        {
            get { return _meshData; }
            set
            {
                if (value == null)
                    return; 
                
                _meshData = value;
                _isMeshDataSet = true;
            }
        }

        public AnchorData AnchorData
        {
            get { return _anchorData; }
            set
            {
                if (value == null)
                    return; 
                
                _anchorData = value;
                _isAnchorDataSet = true;
            }
        }

        public ForceData ForceData
        {
            get { return _forceData; }
            set
            {
                if (value == null)
                    return;

                _forceData = value;
                _isForceDataSet = true;
            }
        }

        public bool IsReadyForSimulation
        {
            get { return _isMeshDataSet && _isAnchorDataSet && _isForceDataSet; }
        }

        public InputComponent()
            : base("InputComponent", "MetaIN", "receives metamaterial mesh data for simulation via websocket",
                "Karamba", "Metamaterials")
        { }

        protected override void RegisterInputParams(GH_InputParamManager pManager)
        { }

        protected override void RegisterOutputParams(GH_OutputParamManager pManager)
        {
            pManager.Register_PointParam("vertices", "vertices", "all vertices from voxels");
            pManager.Register_LineParam("line", "line", "line from json");
            pManager.Register_PointParam("anchor points", "anchors", "anchor points from json");
            pManager.Register_PointParam("load point", "load", "load point from json");
            pManager.Register_VectorParam("load force", "force", "load force from json");
        }

        /// <summary>
        /// This is the method that actually does the work.
        /// </summary>
        /// <param name="dataAccess">The dataAccess object can be used to retrieve data from input parameters and 
        /// to store data in output parameters.</param>
        protected override void SolveInstance(IGH_DataAccess dataAccess)
        {
            ConnectToSocket();

            if (_isMeshDataSet)
            {
                var vertices = GetPointsFromArray(MeshData.Vertices, 3);
                dataAccess.SetDataList(0, vertices);

                var lines = GetLinesFromMeshData();
                dataAccess.SetDataList(1, lines);
            }
            else
            {
                dataAccess.SetDataList(0, new List<Point3d>());
                dataAccess.SetDataList(1, new List<Line>());
            }

            if (_isAnchorDataSet)
            {
                var anchors = GetPointsFromArray(AnchorData.AnchorPoints, 3);
                dataAccess.SetDataList(2, anchors);
            }
            else
            {
                dataAccess.SetDataList(2, new List<Point3d>());
            }

            if (_isForceDataSet)
            {
                dataAccess.SetData(3, new Point3d(ForceData.LoadVertex[0], ForceData.LoadVertex[1], ForceData.LoadVertex[2]));
                dataAccess.SetData(4, new Vector3d(ForceData.ForceVector[0], ForceData.ForceVector[1], ForceData.ForceVector[2]));
            }
            else
            {
                dataAccess.SetData(3, new Point3d());
                dataAccess.SetData(4, new Vector3d());
            }
        }

        private List<Point3d> GetPointsFromArray(double[] array, int increment)
        {
            var points = new List<Point3d>();

            for (var i = 0; i < array.Length; i += increment)
            {
                var point = new Point3d(array[i], array[i+1], array[i+2]);
                points.Add(point);
            }

            return points;
        }

        private List<Line> GetLinesFromMeshData()
        {
            var lines = new List<Line>();

            for (var i = 0; i < MeshData.Edges.Length; i+=2)
            {
                var edgeIndex1 = MeshData.Edges[i];
                var edgeIndex2 = MeshData.Edges[i + 1];
                var vertexIndex1 = edgeIndex1*3;
                var vertexIndex2 = edgeIndex2*3;

                var line = new Line(
                    MeshData.Vertices[vertexIndex1], MeshData.Vertices[vertexIndex1 + 1], MeshData.Vertices[vertexIndex1 + 2], 
                    MeshData.Vertices[vertexIndex2], MeshData.Vertices[vertexIndex2 + 1], MeshData.Vertices[vertexIndex2+2]);

                lines.Add(line);
            }

            return lines;
        }

        private void ConnectToSocket()
        {
            if (_socketServer != null)
                return;

            //read url in json
            try
            {   // Open the text file using a stream reader.
                using (var reader = new StreamReader("editorURL.json"))
                {
                    // Read the stream to a string, and write the string to the console.
                    var json = reader.ReadToEnd();
                    Rhino.RhinoApp.WriteLine("the currently set editor connection is: " + json);

                    var editorConfig = JObject.Parse(json);
                    SocketData.Url = "ws://" + editorConfig["ip"];
                    SocketData.Port = int.Parse(editorConfig["port"].ToString());

                    _socketServer = new WebSocketServer(SocketData.Port);
                    _socketServer.AddWebSocketService(SocketData.Path, () => new SimulationWebSocketBehavior(this));
                    _socketServer.Start();

                    if (_socketServer.IsListening)
                    {
                        Console.WriteLine("Listening on port {0}, and providing WebSocket services:", _socketServer.Port);
                        foreach (var path in _socketServer.WebSocketServices.Paths)
                            Console.WriteLine("- {0}", path);
                    }
                }
            }
            catch (Exception e)
            {
                Rhino.RhinoApp.WriteLine(e.Message);
            }
        }

        /// <summary>
        /// Provides an Icon for every component that will be visible in the User Interface.
        /// Icons need to be 24x24 pixels.
        /// </summary>
        protected override Bitmap Icon
        {
            get
            {
                // You can add image files to your project resources and access them like this:
                //return Resources.IconForThisComponent;
                return null;
            }
        }

        /// <summary>
        /// Each component must have a unique Guid to identify it. 
        /// It is vital this Guid doesn't change otherwise old ghx files 
        /// that use the old ID will partially fail during loading.
        /// </summary>
        public override Guid ComponentGuid
        {
            get { return new Guid("{d7ddf8be-0e20-4761-a38e-a7f64377f467}"); }
        }

    }

    
}