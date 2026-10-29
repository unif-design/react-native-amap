#include "ColorParser.hpp"

#include <cstdint>
#include <iomanip>
#include <iostream>

int main(int argc, char** argv) {
  for (int index = 1; index < argc; ++index) {
    const std::uint32_t color = gaodemap::parseColor(argv[index]);
    std::cout << std::uppercase << std::hex << std::setw(8)
              << std::setfill('0') << color << '\n';
  }
  return 0;
}
