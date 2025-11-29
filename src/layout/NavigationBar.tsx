import TitleBar from "./navigation/TitleBar";
import SearchComponent from "./navigation/SearchComponent";

const Header = () => {
  return (
    <div className="bg-primary dark:bg-primary-dark text-black dark:text-white w-screen">
      <TitleBar />
      <SearchComponent />
    </div>
  );
};

export default Header;
