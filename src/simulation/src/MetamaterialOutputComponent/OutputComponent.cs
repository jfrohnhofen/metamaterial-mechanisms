using System;
using System.Collections.Generic;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Parameters;
using MetamaterialSimulationInput;
using Newtonsoft.Json;
using Rhino.Geometry;
using WebSocketSharp;

namespace MetamaterialSimulationOutput
{
    public class OutputComponent : GH_Component
    {
        private WebSocket _socket;

        public OutputComponent()
            : base("OutputComponent", "MetaOUT", "send transformed metamaterial vertices back via websocket",
                "Karamba", "Metamaterials")
        { }

        public override Guid ComponentGuid
        {
            get { return new Guid("{a36452ee-672e-421c-a800-f361f37c3869}"); }
        }

        protected override void RegisterInputParams(GH_InputParamManager pManager)
        {
            pManager.AddParameter(new Param_Point(), "tansformedPoints", "tansformedPoints", "tansformed points", GH_ParamAccess.list);
        }

        protected override void RegisterOutputParams(GH_OutputParamManager pManager)
        { }

        protected override void SolveInstance(IGH_DataAccess dataAccess)
        {
            ClientConnectToSocket();

            List<Point3d> transformedPoints = new List<Point3d>();
            if (dataAccess.GetDataList(0, transformedPoints))
            {
                var vertices = GetArrayFromPoints(transformedPoints);
                var simulationData = new SimulationData
                {
                    Method = "GetTransformedVertices",
                    Parameters = new TransformedData { Vertices = vertices }
                };

                var jsonSimulationData = JsonConvert.SerializeObject(simulationData);
                _socket.Send(jsonSimulationData);
            }
        }

        private void ClientConnectToSocket()
        {
            if(_socket != null)
                return;

            _socket = new WebSocket(SocketData.Url + ":" + SocketData.Port + SocketData.Path);
           
            //socket.OnOpen += (sender, e) => socket.Send("Hi, there!");
            //socket.OnMessage += (sender, e) => Console.WriteLine(e.Data);
            //socket.OnError += (sender, e) => Console.WriteLine(e.Message);
            //socket.OnClose += (sender, e) => Console.WriteLine(e.Reason);

            _socket.Connect();
        }

        private double[] GetArrayFromPoints(List<Point3d> points)
        {
            var array = new double[points.Count * 3];

            for (var i = 0; i < points.Count; i++)
            {
                var point = points[i];
                array[i * 3] = point.X;
                array[i * 3 + 1] = point.Y;
                array[i * 3 + 2] = point.Z;
            }

            return array;
        }

    }
}
