using System;
using System.Runtime.InteropServices;
class Capturador
{
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern IntPtr LoadLibrary(string path);
    
    [DllImport("kernel32.dll", EntryPoint="GetProcAddress")]
    static extern IntPtr GetProcAddressByOrdinal(IntPtr h, IntPtr ordinal);
    
    static void Main()
    {
        string dll = "C:\\Program Files\\HID Global\\Authentication Device Client\\Bin\\DPDeviceBioMini.dll";
        IntPtr lib = LoadLibrary(dll);
        if (lib == IntPtr.Zero) { Console.WriteLine("Error: " + Marshal.GetLastWin32Error()); return; }
        Console.WriteLine("DLL cargada OK");
        for (int i = 1; i <= 50; i++)
        {
            IntPtr addr = GetProcAddressByOrdinal(lib, (IntPtr)i);
            if (addr != IntPtr.Zero) Console.WriteLine("Ordinal " + i + ": " + addr.ToString("X"));
        }
    }
}