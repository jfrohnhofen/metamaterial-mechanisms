namespace MetamaterialSimulationInput
{
    public class SimulationData
    {
        public string Method { get; set; }
        public object Parameters { get; set; }
    }

    public class MeshData
    {
        public double[] Vertices { get; set; }
        public int[] Edges { get; set; }
        public double[] Stiffness { get; set; }
    }

    public class AnchorData
    {
        public double[] AnchorPoints { get; set; }
    }

    public class ForceData
    {
        public double[] LoadVertex { get; set; }
        public double[] ForceVector { get; set; }
    }

    public class TransformedData
    {
        public double[] Vertices { get; set; }
    }

    //public class SimulationData
    //{
    //    public List<List<RawLine>> Lines { get; set; }
    //    public List<Point3> AnchorPoints { get; set; }
    //    public LoadData Load { get; set; }
    //}

    //public class RawLine
    //{
    //    public Point3 Vertex1 { get; set; }
    //    public Point3 Vertex2 { get; set; }
    //    public double Stiffness { get; set; }
    //}

    //public class LoadData
    //{
    //    public Point3 LoadPoint { get; set; }
    //    public Point3 Force { get; set; }
    //}

    //public class Point3
    //{
    //    public double X { get; set; }
    //    public double Y { get; set; }
    //    public double Z { get; set; }
    //}
}
