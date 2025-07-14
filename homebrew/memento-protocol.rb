class MementoProtocol < Formula
  desc "A lightweight meta-framework for Claude Code"
  homepage "https://github.com/memento-protocol/memento-protocol"
  version "0.1.0"
  
  if OS.mac?
    url "https://github.com/memento-protocol/memento-protocol/releases/download/v#{version}/memento-#{version}-darwin"
    sha256 "PLACEHOLDER_SHA256_DARWIN"
  elsif OS.linux?
    url "https://github.com/memento-protocol/memento-protocol/releases/download/v#{version}/memento-#{version}-linux"
    sha256 "PLACEHOLDER_SHA256_LINUX"
  end
  
  def install
    bin.install "memento-#{version}-#{OS.kernel_name.downcase}" => "memento"
  end
  
  test do
    system "#{bin}/memento", "--version"
  end
end