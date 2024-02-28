import Sorter from "@/components/sorter";

const characters = [
  "Reimu Hakurei",
  "Marisa Kirisame",
  "Sanae Kochiya",
  "Youmu Konpaku",
  "Reisen Udongein Inaba",
  "Cirno",
  "Remilia Scarlet",
  "Flandre Scarlet",
  "Sakuya Izayoi",
  "Yukari Yakumo",
];

export default function Home() {
  console.log(characters);
  // user is able to choose between two characters until the list is sorted using merge sort.
  // the user can also choose to tie the two characters.
  // Skipping is not allowed.
  // Basically a merge sort where the user compare two characters at a time.
  // I have provided a basic layout for the page.

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Sorter />
    </main>
  );
}
