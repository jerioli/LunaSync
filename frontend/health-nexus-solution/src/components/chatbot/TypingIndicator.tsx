
export const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-gray-500 text-sm">typing</div>
      <div className="flex space-x-1">
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{animationDelay: '0s', animationDuration: '1.4s'}}
        ></div>
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{animationDelay: '0.2s', animationDuration: '1.4s'}}
        ></div>
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{animationDelay: '0.4s', animationDuration: '1.4s'}}
        ></div>
      </div>
    </div>
  );
};
