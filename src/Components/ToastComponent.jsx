
const ToastComponent = ({ message, type = "success" }) => {
  const bgColor =
    type === "success" ? "bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 text-green-800" :
    type === "error" ? "bg-gradient-to-r from-red-50 to-rose-100 border border-red-200 text-red-800" :
    "bg-gradient-to-r from-gray-50 to-slate-100 border border-gray-200 text-gray-800";

  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${bgColor}`}>
      {type === 'error' ? 
        <p className="flex items-center gap-3 font-medium">
          {message}
        </p> : 
        <p className="flex items-center gap-3 font-medium">
          {message}
        </p>
      }
    </div>
  );
};

export default ToastComponent;