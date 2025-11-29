import WebViewInstance from "../components/browser/WebViewInstance";
import NewTab from "../screens/NewTab";
import { useTabStore } from "../stores/tabStore";

export default function BrowserView() {
  const { tabs, activeTab } = useTabStore();

  //console.log(tabs);
  tabs;
  return (
    <div
      className="flex-1 relative bg-primary dark:bg-primary-dark w-full h-full"
      style={{ width: "100%", height: "100%" }}
    >
      {tabs.map((tab) => {
        if (tab.url === "/" || !tab.url) {
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 w-full h-full ${
                tab.id === activeTab ? "block" : "hidden"
              }`}
              style={{ width: "100%", height: "100%" }}
            >
              <NewTab />
            </div>
          );
        }

        return (
          <WebViewInstance
            key={tab.id}
            id={tab.id}
            url={tab.url}
            isActive={tab.id === activeTab}
          />
        );
      })}
    </div>
  );
}
