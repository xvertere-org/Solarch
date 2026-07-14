class Solarch < Formula
  desc "TypeScript backend-as-a-service with SQLite, auth, realtime, and admin UI"
  homepage "https://github.com/Jay-Suryawansh7/Solarch"
  url "https://registry.npmjs.org/solarch/-/solarch-0.15.0.tgz"
  sha256 "REPLACE_WITH_SHA256"
  license "Apache-2.0"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args(keep_bin: true)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/solarch", "--version"
  end
end
