import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-col items-center px-4 py-10 min-h-[calc(100vh-64px)]">
        <section className="max-w-xl text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">Welcome to sortr.io</h1>
          <p className="text-lg text-muted-foreground">
            Create and share ranked lists for anything—albums, movies, characters, and more. Powered by simple pairwise comparison.
          </p>
        </section>
        <section className="w-full max-w-2xl">
          <h2 className="text-2xl font-semibold mb-6">Featured Sorters</h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MCU Movies</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  23 items &bull; by <b>MarvelFan</b>
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Best Touhou Characters</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  100+ items &bull; by <b>touhoulover</b>
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top 20 JRPG Soundtracks</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  20 items &bull; by <b>rpgenthusiast</b>
                </span>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
  );
}
