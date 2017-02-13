using System;
using Newtonsoft.Json;
using Rhino;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace MetamaterialSimulationInput
{
    public class SimulationWebSocketBehavior : WebSocketBehavior
    {
        private readonly InputComponent _component;

        public SimulationWebSocketBehavior(InputComponent component)
        {
            if (component == null)
                throw new ArgumentNullException("component");

            _component = component;
        }

        //protected override void OnOpen()
        //{
        //    base.OnOpen();
        //    _component.EditorSessionID = ID;
        //}

        protected override void OnMessage(MessageEventArgs e)
        {
            if (e.Data.IsNullOrEmpty())
                return;

            var json = e.Data;
            var simulationData = JsonConvert.DeserializeObject<SimulationData>(json);

            if (simulationData.Method == "GetTransformedVertices")
            {
                Sessions.SendTo(json, SocketData.EditorSessionID);
            }
            else
            {
                if(!IsValidSimulationRequest(simulationData))
                    return;

                ParseSimulationData(simulationData);
                SocketData.EditorSessionID = ID;
            }

            //_component.TestOutput = e.Data;
            //RhinoApp.MainApplicationWindow.Invoke(new Action(() => _component.ExpireSolution(true)));

            //Send(e.Data);
        }

        private bool IsValidSimulationRequest(SimulationData simulationData)
        {
            return simulationData.Method == "SetMesh" || 
                   simulationData.Method == "SetAnchorPoints" ||
                   simulationData.Method == "Simulate";
        }

        private void RunValidSimulation()
        {
            if (_component.IsReadyForSimulation)
                RhinoApp.MainApplicationWindow.Invoke(new Action(() => _component.ExpireSolution(true)));
        }

        private void ParseSimulationData(SimulationData simulationData)
        {
            switch (simulationData.Method)
            {
                case "SetMesh":
                    ParseMeshData(simulationData.Parameters);
                    break;

                case "SetAnchorPoints":
                    ParseAnchorData(simulationData.Parameters);
                    break;

                case "Simulate":
                    ParseForceData(simulationData.Parameters);
                    break;
            }
        }

        private void ParseMeshData(object parameters)
        {
            var meshData = JsonConvert.DeserializeObject<MeshData>(parameters.ToString());
            _component.MeshData = meshData;

            RunValidSimulation();
        }

        private void ParseAnchorData(object parameters)
        {
            var anchorData = JsonConvert.DeserializeObject<AnchorData>(parameters.ToString());
            _component.AnchorData = anchorData;

            RunValidSimulation();
        }

        private void ParseForceData(object parameters)
        {
            var forceData = JsonConvert.DeserializeObject<ForceData>(parameters.ToString());
            _component.ForceData = forceData;

            RunValidSimulation();
        }
    }
}
