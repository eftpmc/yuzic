import Search from "@/screens/search";
import { SearchProvider } from "@/contexts/SearchContext";

export default function SearchScreen() {
  return (
    <SearchProvider>
      <Search />
    </SearchProvider>
  );
}
